"""
views_agent.py — Agent Processing Module
All agent-related views are isolated here to avoid touching existing views.py
"""
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import Agent, AgentAssignment, Application, UniversityVisitRecord, UniversityVisitPhoto, UniversityDecisionRecord
from .models import TrackingHistory, College

from functools import wraps
from datetime import date, timedelta
from django.core import signing


# ─────────────────────────────────────────────────────────────
# AUTH — SIGNED AGENT TOKENS
#
# Agents used to be identified purely by the <agent_id> in the URL,
# which meant Agent A could read/mutate Agent B's data just by
# changing the number. Login now issues a signed token; every agent
# endpoint verifies it and refuses when the token's agent does not
# match the agent_id in the URL.
# ─────────────────────────────────────────────────────────────

AGENT_TOKEN_SALT = "100ts.agent.portal.v1"
AGENT_TOKEN_MAX_AGE = 60 * 60 * 24 * 7  # 7 days


def make_agent_token(agent):
    """Stateless, tamper-proof token. No migration needed."""
    return signing.dumps(
        {"agent_id": agent.id, "employee_id": agent.employee_id},
        salt=AGENT_TOKEN_SALT,
    )


def agent_id_from_token(request):
    """Read the agent id out of Authorization: Bearer <token> (or X-Agent-Token)."""
    raw = (request.headers.get("Authorization") or "").strip()
    if raw.lower().startswith("bearer "):
        raw = raw[7:].strip()
    else:
        raw = (request.headers.get("X-Agent-Token") or "").strip()
    if not raw:
        return None
    try:
        payload = signing.loads(raw, salt=AGENT_TOKEN_SALT, max_age=AGENT_TOKEN_MAX_AGE)
    except signing.SignatureExpired:
        return None
    except signing.BadSignature:
        return None
    return payload.get("agent_id")


def agent_required(view_func):
    """
    Gate every /api/agent/<agent_id>/... endpoint.

      no/expired token          -> 401 AUTH_REQUIRED
      token agent != URL agent  -> 403 FORBIDDEN
      deactivated agent         -> 401 AUTH_REQUIRED
      otherwise                 -> request.agent is set, view runs
    """
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        token_agent_id = agent_id_from_token(request)
        if token_agent_id is None:
            return JsonResponse(
                {"error": "Authentication required. Please sign in again.",
                 "code": "AUTH_REQUIRED"},
                status=401,
            )

        url_agent_id = kwargs.get("agent_id", args[0] if args else None)
        if url_agent_id is not None and int(url_agent_id) != int(token_agent_id):
            return JsonResponse(
                {"error": "Forbidden — you can only access your own assignments.",
                 "code": "FORBIDDEN"},
                status=403,
            )

        try:
            request.agent = Agent.objects.get(id=token_agent_id, is_active=True)
        except Agent.DoesNotExist:
            return JsonResponse(
                {"error": "Agent account not found or deactivated.",
                 "code": "AUTH_REQUIRED"},
                status=401,
            )
        return view_func(request, *args, **kwargs)

    return _wrapped


# ─────────────────────────────────────────────────────────────
# WORKFLOW STATE MACHINE (single source of truth)
# The agent may never pick an arbitrary status — only the legal
# next step(s) from where they currently are.
# ─────────────────────────────────────────────────────────────

VALID_TRANSITIONS = {
    "ASSIGNED_TO_AGENT": [],  # handled by accept / reject endpoints
    "ACCEPTED": ["IN_PROGRESS"],
    "IN_PROGRESS": ["DOCUMENTS_COLLECTED"],
    "DOCUMENTS_COLLECTED": ["SUBMITTED_TO_UNIVERSITY"],
    "SUBMITTED_TO_UNIVERSITY": ["APPROVED", "REJECTED_BY_UNIVERSITY",
                                "ADDITIONAL_DOC_REQUIRED", "COMPLETED"],
    "ADDITIONAL_DOC_REQUIRED": ["SUBMITTED_TO_UNIVERSITY", "DOCUMENTS_COLLECTED", "IN_PROGRESS"],
    "REJECTED_BY_UNIVERSITY": ["IN_PROGRESS"],
    "APPROVED": ["COMPLETED", "DELIVERY_ASSIGNED"],
    "DELIVERY_ASSIGNED": ["PICKED_UP"],
    "PICKED_UP": ["OUT_FOR_DELIVERY"],
    "OUT_FOR_DELIVERY": ["DELIVERED"],
    "DELIVERED": ["COMPLETED"],
}

STATUS_LABELS = {
    "ASSIGNED_TO_AGENT": "Assigned",
    "ACCEPTED": "Accepted",
    "IN_PROGRESS": "In Progress",
    "DOCUMENTS_COLLECTED": "Documents Collected",
    "SUBMITTED_TO_UNIVERSITY": "Submitted to University",
    "APPROVED": "University Approved",
    "REJECTED_BY_UNIVERSITY": "University Rejected",
    "ADDITIONAL_DOC_REQUIRED": "Additional Documents Required",
    "COMPLETED": "Completed",
    "REJECTED_BY_AGENT": "Rejected by Agent",
    "DELIVERY_ASSIGNED": "Delivery Assigned",
    "PICKED_UP": "Picked Up",
    "OUT_FOR_DELIVERY": "Out for Delivery",
    "DELIVERED": "Delivered",
}

# The single button the agent sees for their current state.
NEXT_ACTION = {
    "ACCEPTED":                ("IN_PROGRESS",             "Start Visit / Mark In Progress"),
    "IN_PROGRESS":             ("DOCUMENTS_COLLECTED",     "Mark Documents Collected"),
    "DOCUMENTS_COLLECTED":     ("SUBMITTED_TO_UNIVERSITY", "Submit to University"),
    "APPROVED":                ("DELIVERY_ASSIGNED",       "Arrange Delivery"),
    "DELIVERY_ASSIGNED":       ("PICKED_UP",               "Mark Picked Up"),
    "PICKED_UP":               ("OUT_FOR_DELIVERY",        "Mark Out for Delivery"),
    "OUT_FOR_DELIVERY":        ("DELIVERED",               "Mark Delivered"),
    "DELIVERED":               ("COMPLETED",               "Close & Mark Completed"),
    "ADDITIONAL_DOC_REQUIRED": ("SUBMITTED_TO_UNIVERSITY", "Re-submit to University"),
    "REJECTED_BY_UNIVERSITY":  ("IN_PROGRESS",             "Retry — Back to In Progress"),
}

# Which inline form the agent must fill at this stage, if any.
ACTION_FORM = {
    "ASSIGNED_TO_AGENT":       "ACCEPT_REJECT",
    "IN_PROGRESS":             "VISIT",
    "DOCUMENTS_COLLECTED":     "UPLOAD",
    "SUBMITTED_TO_UNIVERSITY": "DECISION",
    "APPROVED":                "LOGISTICS",
}


def log_activity(application, status, description):
    """Append to TrackingHistory — this is what feeds Recent Activity."""
    try:
        TrackingHistory.objects.create(
            application=application,
            status=status,
            description=description,
        )
    except Exception:
        pass  # activity logging must never break the workflow



# ─────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────

def agent_to_dict(agent):
    return {
        "id": agent.id,
        "name": agent.name,
        "employee_id": agent.employee_id,
        "mobile": agent.mobile,
        "email": agent.email,
        "is_active": agent.is_active,
        "location": agent.location,
        "experience": agent.experience,
        "current_workload": agent.current_workload,
        "created_at": agent.created_at.isoformat(),
    }


def _campus_location(name):
    """Best-effort street/city for a university or college name, from the College table."""
    if not name:
        return ""
    try:
        c = College.objects.filter(name__icontains=name.strip()[:40]).first()
        if c:
            return ", ".join([p for p in [c.location, c.district] if p])
    except Exception:
        pass
    return ""


def assignment_to_dict(assignment):
    app = assignment.application
    agent = assignment.agent
    from .models import Users, Issue, AgentAdminMessage
    
    unread_count_admin = 0
    unread_count_agent = 0
    if agent:
        unread_count_admin = AgentAdminMessage.objects.filter(
            application=app, agent=agent, is_from_admin=False, is_read=False
        ).count()
        unread_count_agent = AgentAdminMessage.objects.filter(
            application=app, agent=agent, is_from_admin=True, is_read=False
        ).count()

    if assignment.status == "ADDITIONAL_DOC_REQUIRED" and not app.issues.exclude(status='RESOLVED').exists():
        user = Users.objects.filter(email__iexact=app.email).first()
        if user:
            Issue.objects.create(
                application=app,
                agent=assignment.agent,
                user=user,
                message=app.admin_message or "Additional documents required.",
                status='OPEN'
            )
    first_degree = app.degrees.first()
    university = first_degree.university if first_degree else "N/A"
    from datetime import timedelta
    docs = app.documents.all()
    documents_list = [{"id": d.id, "name": d.name, "url": d.file.url if d.file else ""} for d in docs]
    expected_completion = (assignment.assigned_at + timedelta(days=14)).isoformat() if assignment.assigned_at else None

    college_name = first_degree.college if first_degree else ""
    destination = _campus_location(college_name) or _campus_location(university) or college_name or university

    return {
        "id": assignment.id,
        "application_id": app.id,
        "route_from": (agent.location if agent else "") or "",
        "route_to": destination or "",
        "application_display_id": app.tracking_id,
        "applicant_name": app.fullName,
        "phone": app.phone,
        "email": app.email,
        "requirement": app.requirement,
        "university": university,
        "college": first_degree.college if first_degree else "N/A",
        "degree_type": first_degree.type if first_degree else "N/A",
        "course": first_degree.course if first_degree else "N/A",
        "app_status": app.status,
        "payment_status": app.payment_status,
        "admin_message": app.admin_message,
        "documents": documents_list,
        "expected_completion_date": expected_completion,
        "agent": agent_to_dict(agent) if agent else None,
        "unread_count_admin": unread_count_admin,
        "unread_count_agent": unread_count_agent,
        "status": assignment.status,
        "assigned_at": assignment.assigned_at.isoformat() if assignment.assigned_at else None,
        "accepted_at": assignment.accepted_at.isoformat() if assignment.accepted_at else None,
        "completed_at": assignment.completed_at.isoformat() if assignment.completed_at else None,
        "agent_rejection_reason": assignment.agent_rejection_reason,
        "progress_note": assignment.progress_note,
        # ── Workflow guidance (drives the single "next action" button) ──
        "status_label": STATUS_LABELS.get(assignment.status, assignment.status),
        "allowed_next_statuses": VALID_TRANSITIONS.get(assignment.status, []),
        "next_action": (
            {"status": NEXT_ACTION[assignment.status][0],
             "label": NEXT_ACTION[assignment.status][1]}
            if assignment.status in NEXT_ACTION else None
        ),
        "action_form": ACTION_FORM.get(assignment.status),
        "is_terminal": assignment.status in ("COMPLETED", "REJECTED_BY_AGENT"),
        # Phase 6 logistics
        "collected_document_url": assignment.collected_document_url,
        "courier_partner": assignment.courier_partner,
        "tracking_id": assignment.tracking_id,
        "tracking_url": assignment.tracking_url,
        # Phase 6 visit record
        "visit_record": _visit_to_dict(assignment) if hasattr(assignment, 'visit_record') else None,
        # Phase 7 decision record
        "decision_record": _decision_to_dict(assignment) if hasattr(assignment, 'decision_record') else None,
        # Active Issue details
        "active_issue": (
            {
                "id": app.issues.exclude(status='RESOLVED').first().id,
                "message": app.issues.exclude(status='RESOLVED').first().message,
                "status": app.issues.exclude(status='RESOLVED').first().status,
                "user_response": app.issues.exclude(status='RESOLVED').first().user_response,
                "required_documents": app.issues.exclude(status='RESOLVED').first().required_documents,
                "created_at": app.issues.exclude(status='RESOLVED').first().created_at.isoformat(),
                "updated_at": app.issues.exclude(status='RESOLVED').first().updated_at.isoformat(),
                "documents": [
                    {
                        "id": doc.id,
                        "name": doc.name,
                        "url": doc.file.url if doc.file else ""
                    } for doc in app.issues.exclude(status='RESOLVED').first().documents.all()
                ]
            } if app.issues.exclude(status='RESOLVED').exists() else None
        ),
    }


def get_agent_from_request(request):
    """Simple session-like check — agent_id in POST body or header."""
    agent_id = request.headers.get("X-Agent-ID") or request.POST.get("agent_id")
    if agent_id:
        try:
            return Agent.objects.get(id=int(agent_id), is_active=True)
        except Agent.DoesNotExist:
            return None
    return None


# ─────────────────────────────────────────────────────────────
# AGENT LOGIN
# ─────────────────────────────────────────────────────────────

@csrf_exempt
def agent_login(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body)
        email = data.get("email", "").strip()
        password = data.get("password", "").strip()

        agent = Agent.objects.filter(email=email).first()
        if not agent:
            return JsonResponse({"error": "Agent not found"}, status=404)
        if not agent.is_active:
            return JsonResponse({"error": "Your account is deactivated. Contact admin."}, status=403)
        if agent.password != password:
            return JsonResponse({"error": "Invalid password"}, status=401)

        return JsonResponse({
            "message": "Login successful",
            "type": "agent",
            "token": make_agent_token(agent),
            "data": {
                "id": agent.id,
                "name": agent.name,
                "email": agent.email,
                "employee_id": agent.employee_id,
                "location": agent.location,
            }
        }, status=200)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ─────────────────────────────────────────────────────────────
# ADMIN — AGENT CRUD
# ─────────────────────────────────────────────────────────────

@csrf_exempt
def admin_agents_list(request):
    """GET: list all agents | POST: create agent"""
    if request.method == "GET":
        agents = Agent.objects.all().order_by('-created_at')
        return JsonResponse([agent_to_dict(a) for a in agents], safe=False)

    if request.method == "POST":
        try:
            data = json.loads(request.body)
            required = ["name", "employee_id", "mobile", "email", "password"]
            for field in required:
                if not data.get(field):
                    return JsonResponse({"error": f"{field} is required"}, status=400)

            if Agent.objects.filter(employee_id=data["employee_id"]).exists():
                return JsonResponse({"error": "Employee ID already exists"}, status=400)
            if Agent.objects.filter(email=data["email"]).exists():
                return JsonResponse({"error": "Email already registered"}, status=400)

            agent = Agent.objects.create(
                name=data["name"].strip(),
                employee_id=data["employee_id"].strip(),
                mobile=data["mobile"].strip(),
                email=data["email"].strip(),
                password=data["password"],
                is_active=data.get("is_active", True),
                location=data.get("location", "").strip(),
                experience=int(data.get("experience", 0)),
            )
            return JsonResponse(agent_to_dict(agent), status=201)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def admin_agent_detail(request, agent_id):
    """GET / PUT / DELETE single agent"""
    try:
        agent = Agent.objects.get(id=agent_id)
    except Agent.DoesNotExist:
        return JsonResponse({"error": "Agent not found"}, status=404)

    if request.method == "GET":
        return JsonResponse(agent_to_dict(agent))

    if request.method == "PUT":
        try:
            data = json.loads(request.body)
            agent.name = data.get("name", agent.name).strip()
            agent.mobile = data.get("mobile", agent.mobile).strip()
            agent.email = data.get("email", agent.email).strip()
            agent.location = data.get("location", agent.location).strip()
            agent.experience = int(data.get("experience", agent.experience))
            agent.is_active = data.get("is_active", agent.is_active)
            if data.get("password"):
                agent.password = data["password"]
            agent.save()
            return JsonResponse(agent_to_dict(agent))
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    if request.method == "DELETE":
        agent.delete()
        return JsonResponse({"message": "Agent deleted"})

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def admin_agent_toggle(request, agent_id):
    """Toggle agent active/inactive status."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        agent = Agent.objects.get(id=agent_id)
        agent.is_active = not agent.is_active
        agent.save()
        return JsonResponse({
            "message": f"Agent {'activated' if agent.is_active else 'deactivated'}",
            "is_active": agent.is_active
        })
    except Agent.DoesNotExist:
        return JsonResponse({"error": "Agent not found"}, status=404)


# ─────────────────────────────────────────────────────────────
# ADMIN — AGENT ASSIGNMENT
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
def admin_eligible_agents(request, app_id):
    """Return active agents for an application, optionally scored by location."""
    try:
        app = Application.objects.get(id=app_id)
    except Application.DoesNotExist:
        return Response({"error": "Application not found"}, status=404)

    agents = Agent.objects.filter(is_active=True)
    result = []
    for a in agents:
        d = agent_to_dict(a)
        # Simple location match score
        d["location_match"] = (
            app.degrees.filter(university__icontains=a.location).exists()
            if a.location else False
        )
        result.append(d)

    # Sort: location match first, then workload asc, then experience desc
    result.sort(key=lambda x: (
        0 if x["location_match"] else 1,
        x["current_workload"],
        -x["experience"]
    ))
    return Response(result)


@csrf_exempt
def admin_assign_agent(request, app_id):
    """Manually assign an agent to an application."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body)
        agent_id = data.get("agent_id")
        if not agent_id:
            return JsonResponse({"error": "agent_id is required"}, status=400)

        app = Application.objects.get(id=app_id)
        agent = Agent.objects.get(id=agent_id, is_active=True)

        from .models import TrackingHistory
        if AgentAssignment.objects.filter(application=app, agent=agent).exists():
            return JsonResponse({"error": "Agent is already assigned to this application"}, status=400)

        assignment = AgentAssignment.objects.create(
            application=app,
            agent=agent,
            status="ASSIGNED_TO_AGENT"
        )
        TrackingHistory.objects.create(
            application=app,
            status="ASSIGNED_TO_AGENT",
            description=f"Assigned to agent: {agent.name}"
        )

        # Notify agent via WhatsApp
        try:
            from .utils import send_interakt_template
            send_interakt_template(
                phone_number=agent.mobile,
                template_name="agent_assigned",
                variables=[agent.name, app.fullName, app.tracking_id],
                application_id=app.application_id,
                customer_name=app.fullName,
                status="ASSIGNED_TO_AGENT"
            )
        except Exception:
            pass  # Notification failure should not block assignment

        return JsonResponse({
            "message": "Agent assigned successfully",
            "assignment": assignment_to_dict(assignment)
        }, status=201)

    except Application.DoesNotExist:
        return JsonResponse({"error": "Application not found"}, status=404)
    except Agent.DoesNotExist:
        return JsonResponse({"error": "Agent not found or inactive"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def admin_auto_assign(request, app_id):
    """Auto-assign best agent based on location, workload, experience."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        app = Application.objects.get(id=app_id)
        active_agents = list(Agent.objects.filter(is_active=True))
        if not active_agents:
            return JsonResponse({"error": "No active agents available"}, status=400)

        # Score each agent
        def score(a):
            location_match = 1 if (a.location and app.degrees.filter(
                university__icontains=a.location
            ).exists()) else 0
            return (-location_match, a.current_workload, -a.experience)

        best_agent = min(active_agents, key=score)

        from .models import TrackingHistory
        if AgentAssignment.objects.filter(application=app, agent=best_agent).exists():
            return JsonResponse({"error": "Best agent is already assigned to this application"}, status=400)

        assignment = AgentAssignment.objects.create(
            application=app,
            agent=best_agent,
            status="ASSIGNED_TO_AGENT"
        )
        TrackingHistory.objects.create(
            application=app,
            status="ASSIGNED_TO_AGENT",
            description=f"Auto-assigned to agent: {best_agent.name}"
        )

        try:
            from .utils import send_interakt_template
            send_interakt_template(
                phone_number=best_agent.mobile,
                template_name="agent_assigned",
                variables=[best_agent.name, app.fullName, app.tracking_id],
                application_id=app.application_id,
                customer_name=app.fullName,
                status="ASSIGNED_TO_AGENT"
            )
        except Exception:
            pass

        return JsonResponse({
            "message": f"Auto-assigned to {best_agent.name}",
            "assignment": assignment_to_dict(assignment)
        }, status=201)

    except Application.DoesNotExist:
        return JsonResponse({"error": "Application not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@api_view(["GET"])
def admin_all_assignments(request):
    """Admin: list all agent assignments."""
    assignments = AgentAssignment.objects.select_related(
        "application", "agent"
    ).order_by("-assigned_at")
    return Response([assignment_to_dict(a) for a in assignments])


@api_view(["GET"])
def admin_application_assignment(request, app_id):
    """Get all assignments for a specific application."""
    assignments = AgentAssignment.objects.filter(application_id=app_id).order_by('-assigned_at')
    return Response({
        "assignments": [assignment_to_dict(a) for a in assignments]
    })


# ─────────────────────────────────────────────────────────────
# AGENT — THEIR ASSIGNMENTS
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
@agent_required
def agent_my_assignments(request, agent_id):
    """Agent: get their own assignments only."""
    try:
        agent = Agent.objects.get(id=agent_id, is_active=True)
    except Agent.DoesNotExist:
        return Response({"error": "Agent not found"}, status=404)

    assignments = AgentAssignment.objects.filter(
        agent=agent
    ).select_related("application").order_by("-assigned_at")
    return Response([assignment_to_dict(a) for a in assignments])


@api_view(["GET"])
@agent_required
def agent_assignment_detail(request, agent_id, assignment_id):
    """Agent: get single assignment — only if it belongs to this agent."""
    try:
        assignment = AgentAssignment.objects.get(
            id=assignment_id, agent_id=agent_id
        )
        return Response(assignment_to_dict(assignment))
    except AgentAssignment.DoesNotExist:
        return Response({"error": "Assignment not found or access denied"}, status=404)


@csrf_exempt
@agent_required
def agent_accept_assignment(request, agent_id, assignment_id):
    """Agent accepts an assignment."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        assignment = AgentAssignment.objects.get(
            id=assignment_id, agent_id=agent_id
        )
        if assignment.status != "ASSIGNED_TO_AGENT":
            return JsonResponse(
                {"error": f"Cannot accept from status: {assignment.status}"}, status=400
            )
        assignment.status = "ACCEPTED"
        assignment.accepted_at = timezone.now()
        assignment.save()

        log_activity(
            assignment.application, "ACCEPTED",
            "Assignment accepted by agent %s" % (assignment.agent.name if assignment.agent else ""),
        )

        # Notify admin via WhatsApp
        try:
            from .utils import send_interakt_template
            app = assignment.application
            send_interakt_template(
                phone_number=assignment.agent.mobile,
                template_name="agent_accepted",
                variables=[assignment.agent.name, app.fullName, app.tracking_id],
                application_id=app.application_id,
                customer_name=app.fullName,
                status="ACCEPTED"
            )
        except Exception:
            pass

        return JsonResponse({
            "message": "Assignment accepted",
            "status": assignment.status
        })
    except AgentAssignment.DoesNotExist:
        return JsonResponse({"error": "Assignment not found or access denied"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@agent_required
def agent_reject_assignment(request, agent_id, assignment_id):
    """Agent rejects an assignment — reason is mandatory."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body)
        reason = (data.get("reason") or "").strip()
        if not reason:
            return JsonResponse({"error": "Rejection reason is required"}, status=400)

        assignment = AgentAssignment.objects.get(
            id=assignment_id, agent_id=agent_id
        )
        if assignment.status not in ["ASSIGNED_TO_AGENT", "ACCEPTED"]:
            return JsonResponse(
                {"error": f"Cannot reject from status: {assignment.status}"}, status=400
            )

        old_agent = assignment.agent
        assignment.status = "REJECTED_BY_AGENT"
        assignment.agent_rejection_reason = reason
        assignment.agent = None  # Unassign so admin can reassign
        assignment.save()

        log_activity(
            assignment.application, "REJECTED_BY_AGENT",
            "Assignment rejected by agent %s - %s" % (old_agent.name, reason),
        )

        # Notify admin
        try:
            from .utils import send_interakt_template
            app = assignment.application
            send_interakt_template(
                phone_number=old_agent.mobile,
                template_name="agent_rejected",
                variables=[old_agent.name, app.fullName, app.tracking_id, reason],
                application_id=app.application_id,
                customer_name=app.fullName,
                status="REJECTED_BY_AGENT"
            )
        except Exception:
            pass

        return JsonResponse({
            "message": "Assignment rejected. Admin will reassign.",
            "status": assignment.status
        })
    except AgentAssignment.DoesNotExist:
        return JsonResponse({"error": "Assignment not found or access denied"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@agent_required
def agent_update_status(request, agent_id, assignment_id):
    """Agent updates their progress status."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    # state machine lives at module level (VALID_TRANSITIONS)

    try:
        data = json.loads(request.body)
        new_status = data.get("status", "").strip()
        note = (data.get("note") or "").strip()

        if not new_status:
            return JsonResponse({"error": "status is required"}, status=400)

        assignment = AgentAssignment.objects.get(
            id=assignment_id, agent_id=agent_id
        )

        allowed = VALID_TRANSITIONS.get(assignment.status, [])
        if new_status not in allowed:
            return JsonResponse({
                "error": f"Cannot move from {assignment.status} to {new_status}. "
                         f"Allowed: {allowed}"
            }, status=400)

        assignment.status = new_status
        if note:
            assignment.progress_note = note
        if new_status == "COMPLETED":
            assignment.completed_at = timezone.now()
        assignment.save()

        app = assignment.application
        if new_status == "REJECTED_BY_UNIVERSITY":
            app.status = "rejected"
            if note:
                app.rejection_reason = note
            app.save()
        elif new_status == "ADDITIONAL_DOC_REQUIRED":
            from .models import Users, Issue, TrackingHistory
            user = Users.objects.filter(email__iexact=app.email).first()
            
            req_docs = data.get("required_documents")
            if isinstance(req_docs, str):
                req_docs = [d.strip() for d in req_docs.split(",") if d.strip()]
            if not isinstance(req_docs, list) or not req_docs:
                req_docs = ["Additional Document"]

            if user:
                Issue.objects.filter(application=app, status__in=['OPEN', 'WAITING_FOR_USER', 'USER_RESPONDED', 'UNDER_REVIEW']).update(status='RESOLVED')
                Issue.objects.create(
                    application=app,
                    agent=assignment.agent,
                    user=user,
                    message=note or "Additional documents required.",
                    status='WAITING_FOR_USER',
                    required_documents=req_docs
                )
            app.status = "WAITING_FOR_USER"
            if note:
                app.admin_message = note
            app.save()
            TrackingHistory.objects.create(
                application=app,
                status="WAITING_FOR_USER",
                description=f"Additional Documents Required: {', '.join(req_docs)}"
            )
        elif new_status == "APPROVED":
            app.status = "approved"
            app.save()
        elif new_status == "DELIVERED":
            app.status = "completed"
            app.save()

        log_activity(
            app, new_status,
            "%s%s" % (STATUS_LABELS.get(new_status, new_status), (" - " + note) if note else ""),
        )

        # Notify
        try:
            from .utils import send_interakt_template
            send_interakt_template(
                phone_number=assignment.agent.mobile,
                template_name="agent_status_update",
                variables=[assignment.agent.name, app.fullName, new_status],
                application_id=app.application_id,
                customer_name=app.fullName,
                status=new_status
            )
        except Exception:
            pass

        return JsonResponse({
            "message": f"Status updated to {new_status}",
            "status": assignment.status,
            "progress_note": assignment.progress_note
        })
    except AgentAssignment.DoesNotExist:
        return JsonResponse({"error": "Assignment not found or access denied"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ─────────────────────────────────────────────────────────────
# PHASE 6: UPLOAD COLLECTED DOCUMENT
# ─────────────────────────────────────────────────────────────

@csrf_exempt
@agent_required
def agent_upload_document(request, agent_id, assignment_id):
    """Agent uploads a scanned copy of the collected document."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        assignment = AgentAssignment.objects.get(id=assignment_id, agent_id=agent_id)
        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return JsonResponse({"error": "No file uploaded"}, status=400)

        # Save file to Application documents folder
        from django.core.files.storage import default_storage
        from django.core.files.base import ContentFile
        import os
        ext = os.path.splitext(uploaded_file.name)[1]
        path = default_storage.save(
            f"agent_docs/assignment_{assignment_id}{ext}",
            ContentFile(uploaded_file.read())
        )
        file_url = default_storage.url(path)

        assignment.collected_document_url = file_url
        assignment.save()

        return JsonResponse({
            "message": "Document uploaded successfully",
            "collected_document_url": file_url
        })
    except AgentAssignment.DoesNotExist:
        return JsonResponse({"error": "Assignment not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ─────────────────────────────────────────────────────────────
# PHASE 6: ADD LOGISTICS (COURIER + TRACKING ID)
# ─────────────────────────────────────────────────────────────

COURIER_TRACKING_URLS = {
    "Shiprocket": "https://shiprocket.co/tracking/",
    "Delhivery": "https://www.delhivery.com/track/package/",
    "BlueDart": "https://www.bluedart.com/tracking?trackFor=0&trackNo=",
    "Other": "",
}

@csrf_exempt
@agent_required
def agent_add_logistics(request, agent_id, assignment_id):
    """Agent adds courier partner + tracking ID, moves status to OUT_FOR_DELIVERY."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body)
        courier_partner = data.get("courier_partner", "").strip()
        tracking_id = data.get("tracking_id", "").strip()

        if not courier_partner or not tracking_id:
            return JsonResponse({"error": "courier_partner and tracking_id are required"}, status=400)

        assignment = AgentAssignment.objects.get(id=assignment_id, agent_id=agent_id)

        if assignment.status not in ["APPROVED", "DELIVERY_ASSIGNED", "COMPLETED"]:
            return JsonResponse(
                {"error": f"Cannot add logistics from status: {assignment.status}"}, status=400
            )

        base_url = COURIER_TRACKING_URLS.get(courier_partner, "")
        tracking_url = f"{base_url}{tracking_id}" if base_url else ""

        assignment.courier_partner = courier_partner
        assignment.tracking_id = tracking_id
        assignment.tracking_url = tracking_url
        assignment.status = "OUT_FOR_DELIVERY"
        assignment.save()

        # Sync Application status
        app = assignment.application
        app.status = "out_for_delivery"
        app.save()

        log_activity(
            app, "OUT_FOR_DELIVERY",
            "Dispatched via %s - tracking %s" % (courier_partner, tracking_id),
        )

        # Notify student
        try:
            from .utils import send_interakt_template
            send_interakt_template(
                phone_number=app.phone,
                template_name="out_for_delivery",
                variables=[app.fullName, courier_partner, tracking_id, tracking_url or "N/A"],
                application_id=app.application_id,
                customer_name=app.fullName,
                status="OUT_FOR_DELIVERY"
            )
        except Exception:
            pass

        return JsonResponse({
            "message": "Logistics added. Status → OUT_FOR_DELIVERY",
            "courier_partner": courier_partner,
            "tracking_id": tracking_id,
            "tracking_url": tracking_url,
            "status": assignment.status
        })
    except AgentAssignment.DoesNotExist:
        return JsonResponse({"error": "Assignment not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ─────────────────────────────────────────────────────────────
# VISIT RECORD HELPER
# ─────────────────────────────────────────────────────────────

def _visit_to_dict(assignment):
    """Return the visit record dict or None if not yet created."""
    try:
        v = assignment.visit_record
        photos = [{"id": p.id, "url": p.photo.url} for p in v.photos.all()]
        return {
            "id": v.id,
            "visit_date": v.visit_date.isoformat() if v.visit_date else None,
            "visit_time": v.visit_time.strftime("%H:%M") if v.visit_time else None,
            "department": v.department,
            "officer_name": v.officer_name,
            "university_reference_number": v.university_reference_number,
            "remarks": v.remarks,
            "university_fee_paid": v.university_fee_paid,
            "university_fee_amount": str(v.university_fee_amount) if v.university_fee_amount else None,
            # Verification checklist
            "chk_verified_student_info": v.chk_verified_student_info,
            "chk_submitted_application": v.chk_submitted_application,
            "chk_verified_documents": v.chk_verified_documents,
            "chk_met_officials": v.chk_met_officials,
            "chk_submitted_forms": v.chk_submitted_forms,
            "chk_paid_fees": v.chk_paid_fees,
            "chk_recorded_reference_number": v.chk_recorded_reference_number,
            "photos": photos,
            "updated_at": v.updated_at.isoformat(),
        }
    except UniversityVisitRecord.DoesNotExist:
        return None


# ─────────────────────────────────────────────────────────────
# PHASE 6: GET VISIT DETAILS
# ─────────────────────────────────────────────────────────────

@csrf_exempt
@agent_required
def agent_get_visit_details(request, agent_id, assignment_id):
    """GET the university visit record for an assignment."""
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        assignment = AgentAssignment.objects.get(id=assignment_id, agent_id=agent_id)
        return JsonResponse({"visit": _visit_to_dict(assignment)})
    except AgentAssignment.DoesNotExist:
        return JsonResponse({"error": "Assignment not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ─────────────────────────────────────────────────────────────
# PHASE 6: SAVE / UPDATE VISIT DETAILS
# ─────────────────────────────────────────────────────────────

@csrf_exempt
@agent_required
def agent_save_visit_details(request, agent_id, assignment_id):
    """POST to create/update the university visit record."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body)
        assignment = AgentAssignment.objects.get(id=assignment_id, agent_id=agent_id)

        visit, created = UniversityVisitRecord.objects.get_or_create(
            assignment=assignment
        )

        # Visit details
        if data.get("visit_date"):
            visit.visit_date = data["visit_date"]
        if data.get("visit_time"):
            visit.visit_time = data["visit_time"]
        visit.department = data.get("department", visit.department)
        visit.officer_name = data.get("officer_name", visit.officer_name)
        visit.university_reference_number = data.get("university_reference_number", visit.university_reference_number)
        visit.remarks = data.get("remarks", visit.remarks)

        # Fee details
        visit.university_fee_paid = data.get("university_fee_paid", visit.university_fee_paid)
        if data.get("university_fee_amount") is not None:
            visit.university_fee_amount = data["university_fee_amount"] or None

        # Verification checklist
        for field in [
            "chk_verified_student_info", "chk_submitted_application",
            "chk_verified_documents", "chk_met_officials",
            "chk_submitted_forms", "chk_paid_fees",
            "chk_recorded_reference_number"
        ]:
            if field in data:
                setattr(visit, field, data[field])

        visit.save()

        log_activity(
            assignment.application, "UNIVERSITY_VISIT",
            "University visit recorded%s%s" % (
                (" on " + str(visit.visit_date)) if visit.visit_date else "",
                (" - met " + visit.officer_name) if visit.officer_name else "",
            ),
        )

        # Ensure assignment is IN_PROGRESS
        if assignment.status == "ACCEPTED":
            assignment.status = "IN_PROGRESS"
            assignment.save()
            app = assignment.application
            app.status = "processing"
            app.save()

        # Notify admin
        try:
            from .utils import send_interakt_template
            app = assignment.application
            send_interakt_template(
                phone_number=assignment.agent.mobile if assignment.agent else "",
                template_name="visit_updated",
                variables=[assignment.agent.name if assignment.agent else "", app.fullName, app.tracking_id],
                application_id=app.application_id,
                customer_name=app.fullName,
                status="IN_PROGRESS"
            )
        except Exception:
            pass

        return JsonResponse({
            "message": "Visit details saved successfully",
            "visit": _visit_to_dict(assignment),
            "created": created
        })
    except AgentAssignment.DoesNotExist:
        return JsonResponse({"error": "Assignment not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ─────────────────────────────────────────────────────────────
# PHASE 6: UPLOAD VISIT PHOTO
# ─────────────────────────────────────────────────────────────

@csrf_exempt
@agent_required
def agent_upload_visit_photo(request, agent_id, assignment_id):
    """POST a photo for the university visit record."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        assignment = AgentAssignment.objects.get(id=assignment_id, agent_id=agent_id)
        photo_file = request.FILES.get("photo")
        if not photo_file:
            return JsonResponse({"error": "No photo file provided"}, status=400)

        visit, _ = UniversityVisitRecord.objects.get_or_create(assignment=assignment)
        visit_photo = UniversityVisitPhoto.objects.create(visit=visit, photo=photo_file)

        return JsonResponse({
            "message": "Photo uploaded",
            "photo_id": visit_photo.id,
            "photo_url": visit_photo.photo.url
        })
    except AgentAssignment.DoesNotExist:
        return JsonResponse({"error": "Assignment not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ─────────────────────────────────────────────────────────────
# PHASE 7: UNIVERSITY DECISION HELPER & VIEW
# ─────────────────────────────────────────────────────────────

def _decision_to_dict(assignment):
    try:
        d = assignment.decision_record
        return {
            "decision": d.decision,
            "officer_name": d.officer_name,
            "remarks": d.remarks,
            "rejection_reason": d.rejection_reason,
            "rejection_letter_url": d.rejection_letter.url if d.rejection_letter else None,
            "required_documents": d.required_documents,
            "deadline": d.deadline.isoformat() if d.deadline else None,
            "university_reference_number": d.university_reference_number,
            "acceptance_date": d.acceptance_date.isoformat() if d.acceptance_date else None,
            "updated_at": d.updated_at.isoformat(),
        }
    except UniversityDecisionRecord.DoesNotExist:
        return None

@csrf_exempt
@agent_required
def agent_submit_university_decision(request, agent_id, assignment_id):
    """POST to create the university decision record and transition state."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    try:
        assignment = AgentAssignment.objects.get(id=assignment_id, agent_id=agent_id)

        # A decision is entered once the file is with the university, and may be
        # corrected afterwards while the outcome still stands - an officer changes
        # their mind, or the agent picked the wrong option. It is locked once the
        # delivery leg has started or the job is closed.
        ENTRY_STATES = ("SUBMITTED_TO_UNIVERSITY",)
        AMEND_STATES = ("APPROVED", "REJECTED_BY_UNIVERSITY", "ADDITIONAL_DOC_REQUIRED")

        if assignment.status not in ENTRY_STATES + AMEND_STATES:
            if assignment.status in ("DELIVERY_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY",
                                     "DELIVERED", "COMPLETED"):
                msg = ("This request has already moved to delivery, so the university "
                       "decision can no longer be changed.")
            else:
                msg = ("You can only record a university decision after the documents "
                       "have been submitted to the university. Current stage: %s."
                       % STATUS_LABELS.get(assignment.status, assignment.status))
            return JsonResponse({"error": msg}, status=400)

        is_amendment = assignment.status in AMEND_STATES

        decision_type = request.POST.get("decision")
        if decision_type not in ["APPROVED", "REJECTED", "ADDITIONAL_DOCS"]:
            return JsonResponse({"error": "Invalid decision type"}, status=400)

        # Create or update decision record
        d, created = UniversityDecisionRecord.objects.get_or_create(assignment=assignment)
        d.decision = decision_type
        d.officer_name = request.POST.get("officer_name", d.officer_name)
        d.remarks = request.POST.get("remarks", d.remarks)

        app = assignment.application

        if decision_type == "REJECTED":
            d.rejection_reason = request.POST.get("rejection_reason")
            if "rejection_letter" in request.FILES:
                d.rejection_letter = request.FILES["rejection_letter"]
            assignment.status = "REJECTED_BY_UNIVERSITY"
            app.status = "rejected"
            # In a real system, notify student & admin here

        elif decision_type == "ADDITIONAL_DOCS":
            d.required_documents = request.POST.get("required_documents")
            deadline_str = request.POST.get("deadline")
            if deadline_str:
                d.deadline = deadline_str
            assignment.status = "ADDITIONAL_DOC_REQUIRED"
            from .models import Users, Issue, TrackingHistory
            user = Users.objects.filter(email__iexact=app.email).first()
            
            req_docs = [doc.strip() for doc in (d.required_documents or "").split(",") if doc.strip()]
            if not req_docs:
                req_docs = ["Additional Document"]

            if user:
                Issue.objects.filter(application=app, status__in=['OPEN', 'WAITING_FOR_USER', 'USER_RESPONDED', 'UNDER_REVIEW']).update(status='RESOLVED')
                msg = d.required_documents or "Additional documents required."
                if d.deadline:
                    msg += f" (Deadline: {d.deadline})"
                Issue.objects.create(
                    application=app,
                    agent=assignment.agent,
                    user=user,
                    message=msg,
                    status='WAITING_FOR_USER',
                    required_documents=req_docs
                )
            app.status = "WAITING_FOR_USER"
            TrackingHistory.objects.create(
                application=app,
                status="WAITING_FOR_USER",
                description=f"Additional Documents Required: {', '.join(req_docs)}"
            )

        elif decision_type == "APPROVED":
            d.university_reference_number = request.POST.get("university_reference_number")
            acceptance_date_str = request.POST.get("acceptance_date")
            if acceptance_date_str:
                d.acceptance_date = acceptance_date_str
            assignment.status = "APPROVED"
            app.status = "approved"

        d.save()
        assignment.save()
        app.save()

        log_activity(
            app, assignment.status,
            "University decision%s: %s%s" % (
                " corrected" if is_amendment else "",
                decision_type,
                (" - " + d.remarks) if d.remarks else "",
            ),
        )

        return JsonResponse({
            "message": f"Decision {decision_type} {'updated' if is_amendment else 'submitted'}",
            "amended": is_amendment,
            "decision_record": _decision_to_dict(assignment),
            "new_status": assignment.status
        })

    except AgentAssignment.DoesNotExist:
        return JsonResponse({"error": "Assignment not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ─────────────────────────────────────────────────────────────
# AGENT WORK DASHBOARD
# One call returns everything the agent's home screen needs, all
# computed server-side and scoped to the logged-in agent.
# ─────────────────────────────────────────────────────────────

_ASSIGNED_STATES = ("ASSIGNED_TO_AGENT", "ACCEPTED")
_DELIVERY_STATES = ("DELIVERY_ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED")
_TERMINAL_STATES = ("COMPLETED", "REJECTED_BY_AGENT")


@api_view(["GET"])
@agent_required
def agent_dashboard(request, agent_id):
    agent = request.agent
    today = timezone.localdate()

    assignments = (
        AgentAssignment.objects
        .filter(agent=agent)
        .select_related("application")
        .order_by("-assigned_at")
    )
    rows = [assignment_to_dict(a) for a in assignments]

    def has(*states):
        return [r for r in rows if r["status"] in states]

    stats = {
        "assigned": len(has(*_ASSIGNED_STATES)),
        "in_progress": len(has("IN_PROGRESS")),
        "collected": len(has("DOCUMENTS_COLLECTED")),
        "completed": len(has("COMPLETED", "DELIVERED")),
        "pending_acceptance": len(has("ASSIGNED_TO_AGENT")),
        "at_university": len(has("SUBMITTED_TO_UNIVERSITY")),
        "out_for_delivery": len(has("OUT_FOR_DELIVERY")),
        "rejected": len(has("REJECTED_BY_AGENT")),
        "total": len(rows),
    }

    active = [r for r in rows if r["status"] not in _TERMINAL_STATES]

    def visit_date_of(r):
        return (r.get("visit_record") or {}).get("visit_date")

    def urgency(r):
        if r["status"] == "ASSIGNED_TO_AGENT":
            return 0
        vd = visit_date_of(r)
        if vd and vd <= today.isoformat():
            return 1
        if r["status"] in ("IN_PROGRESS", "DOCUMENTS_COLLECTED"):
            return 2
        if r["status"] in ("APPROVED",) + _DELIVERY_STATES:
            return 3
        return 4

    today_tasks = sorted(active, key=lambda r: (urgency(r), r["id"]))[:6]
    for r in today_tasks:
        vd = visit_date_of(r)
        r["urgency"] = urgency(r)
        r["is_overdue"] = bool(
            vd and vd < today.isoformat()
            and r["status"] not in ("APPROVED",) + _DELIVERY_STATES
        )

    visits = []
    for r in rows:
        vr = r.get("visit_record")
        pending_visit = r["status"] in ("ACCEPTED", "IN_PROGRESS")
        if not vr and not pending_visit:
            continue
        visits.append({
            "assignment_id": r["id"],
            "application_display_id": r["application_display_id"],
            "student": r["applicant_name"],
            "student_phone": r["phone"],
            "university": r["university"],
            "college": r["college"],
            "address": r["route_to"],
            "documents": r["requirement"],
            "visit_date": (vr or {}).get("visit_date"),
            "visit_time": (vr or {}).get("visit_time"),
            "department": (vr or {}).get("department"),
            "officer_name": (vr or {}).get("officer_name"),
            "reference_number": (vr or {}).get("university_reference_number"),
            "scheduled": bool(vr and vr.get("visit_date")),
            "status": r["status"],
            "status_label": r["status_label"],
        })
    visits.sort(key=lambda v: (v["visit_date"] or "9999-12-31", v["assignment_id"]))

    deliveries = [
        {
            "assignment_id": r["id"],
            "application_display_id": r["application_display_id"],
            "student": r["applicant_name"],
            "student_phone": r["phone"],
            "documents_collected": bool(r["collected_document_url"]),
            "collected_document_url": r["collected_document_url"],
            "courier_partner": r["courier_partner"],
            "tracking_id": r["tracking_id"],
            "tracking_url": r["tracking_url"],
            "status": r["status"],
            "status_label": r["status_label"],
        }
        for r in rows
        if r["status"] in ("APPROVED",) + _DELIVERY_STATES or r["courier_partner"] or r["tracking_id"]
    ]

    app_ids = [r["application_id"] for r in rows]
    display_by_app = {r["application_id"]: r["application_display_id"] for r in rows}
    history = (
        TrackingHistory.objects
        .filter(application_id__in=app_ids)
        .order_by("-created_at")[:12]
    )
    recent_activity = [
        {
            "id": h.id,
            "application_id": h.application_id,
            "application_display_id": display_by_app.get(h.application_id),
            "status": h.status,
            "status_label": STATUS_LABELS.get(h.status, h.status.replace("_", " ").title()),
            "description": h.description or "",
            "created_at": h.created_at.isoformat(),
        }
        for h in history
    ]

    return Response({
        "agent": agent_to_dict(agent),
        "today": today.isoformat(),
        "stats": stats,
        "today_tasks": today_tasks,
        "active_requests": active,
        "visits": visits,
        "deliveries": deliveries,
        "recent_activity": recent_activity,
    })


@csrf_exempt
@agent_required
def agent_resolve_issue(request, agent_id, assignment_id):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        from .models import Issue
        assignment = AgentAssignment.objects.get(id=assignment_id, agent_id=agent_id)
        app = assignment.application

        # Mark active issues as RESOLVED
        issues = app.issues.exclude(status='RESOLVED')
        for issue in issues:
            issue.status = 'RESOLVED'
            issue.save()

        app.status = "approved"
        app.save()

        # Move assignment back to SUBMITTED_TO_UNIVERSITY
        if assignment.status == "ADDITIONAL_DOC_REQUIRED":
            assignment.status = "SUBMITTED_TO_UNIVERSITY"
            assignment.save()

        from .models import TrackingHistory
        TrackingHistory.objects.create(
            application=app,
            status="RESOLVED",
            description="Agent marked issue as resolved. Request processing resumed."
        )

        log_activity(app, "RESOLVED", "Issue marked as resolved by agent.")
        return JsonResponse({
            "message": "Issue marked as resolved successfully",
            "new_status": assignment.status
        })
    except AgentAssignment.DoesNotExist:
        return JsonResponse({"error": "Assignment not found or access denied"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def admin_agent_messages(request, app_id):
    """Admin view to get/post messages for a specific application's assigned agent."""
    try:
        from .models import AgentAdminMessage, Application, AgentAssignment
        application = Application.objects.get(id=app_id)
        # Fetch assignment for assigned agent
        assignment = AgentAssignment.objects.filter(application=application).order_by('-assigned_at').first()
        if not assignment or not assignment.agent:
            return JsonResponse({"error": "No agent assigned to this application"}, status=400)
        agent = assignment.agent
    except Application.DoesNotExist:
        return JsonResponse({"error": "Application not found"}, status=404)

    if request.method == "GET":
        messages = AgentAdminMessage.objects.filter(agent=agent, application=application).order_by('created_at')
        
        # Mark unread messages from agent as read by admin
        messages.filter(is_from_admin=False, is_read=False).update(is_read=True)

        data = []
        for m in messages:
            data.append({
                "id": m.id,
                "message": m.message,
                "is_from_admin": m.is_from_admin,
                "created_at": m.created_at.isoformat(),
                "attachment": m.attachment.url if m.attachment else None,
                "is_read": m.is_read
            })
        
        app_details = {
            "id": application.id,
            "customer_name": getattr(application, 'fullName', 'N/A'),
            "service": getattr(application, 'certificate_type', 'N/A'),
            "university": getattr(application, 'university', 'N/A'),
            "status": assignment.status if assignment else 'N/A',
            "assigned_date": assignment.assigned_at.isoformat() if assignment and assignment.assigned_at else None,
        }
        agent_details = {
            "id": agent.id,
            "name": agent.name,
            "phone": agent.mobile,
            "email": agent.email,
            "area": agent.location,
            "employee_id": agent.employee_id
        }

        return JsonResponse({
            "messages": data,
            "application_details": app_details,
            "agent_details": agent_details
        })

    elif request.method == "POST":
        message_text = request.POST.get("message", "").strip()
        attachment = request.FILES.get("attachment")
        if not message_text and not attachment:
            return JsonResponse({"error": "Message or attachment is required"}, status=400)
        
        msg = AgentAdminMessage.objects.create(
            agent=agent,
            application=application,
            message=message_text,
            attachment=attachment,
            is_from_admin=True
        )
        return JsonResponse({
            "id": msg.id,
            "message": msg.message,
            "is_from_admin": msg.is_from_admin,
            "created_at": msg.created_at.isoformat(),
            "attachment": msg.attachment.url if msg.attachment else None
        }, status=201)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def admin_unread_messages_count(request):
    try:
        from .models import AgentAdminMessage
        count = AgentAdminMessage.objects.filter(is_from_admin=False, is_read=False).count()
        return JsonResponse({"unread_count": count})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@agent_required
def agent_unread_messages_count(request, agent_id):
    try:
        from .models import AgentAdminMessage
        count = AgentAdminMessage.objects.filter(agent_id=agent_id, is_from_admin=True, is_read=False).count()
        return JsonResponse({"unread_count": count})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@csrf_exempt
@agent_required
def agent_admin_messages(request, agent_id, app_id):
    """Agent view to get/post messages to the Admin."""
    if request.method == "GET":
        from .models import AgentAdminMessage, Application, AgentAssignment
        try:
            application = Application.objects.get(id=app_id)
            assignment = AgentAssignment.objects.filter(agent_id=agent_id, application=application).first()
        except Application.DoesNotExist:
            return JsonResponse({"error": "Application not found"}, status=404)

        messages = AgentAdminMessage.objects.filter(agent_id=agent_id, application_id=app_id).order_by('created_at')
        
        # Mark unread messages from admin as read by agent
        unread = messages.filter(is_from_admin=True, is_read=False)
        if unread.exists():
            unread.update(is_read=True)
        
        data = []
        for m in messages:
            data.append({
                "id": m.id,
                "message": m.message,
                "is_from_admin": m.is_from_admin,
                "created_at": m.created_at.isoformat(),
                "attachment": m.attachment.url if m.attachment else None,
                "is_read": m.is_read
            })
        
        agent = request.agent
        app_details = {
            "id": application.id,
            "customer_name": getattr(application, 'fullName', 'N/A'),
            "service": getattr(application, 'certificate_type', 'N/A'),
            "university": getattr(application, 'university', 'N/A'),
            "status": assignment.status if assignment else 'N/A',
            "assigned_date": assignment.assigned_at.isoformat() if assignment and assignment.assigned_at else None,
        }
        agent_details = {
            "id": agent.id,
            "name": agent.name,
            "phone": agent.mobile,
            "email": agent.email,
            "area": agent.location,
            "employee_id": agent.employee_id
        }
        return JsonResponse({
            "messages": data,
            "application_details": app_details,
            "agent_details": agent_details
        })

    elif request.method == "POST":
        try:
            from .models import AgentAdminMessage
            message_text = request.POST.get("message", "").strip()
            attachment = request.FILES.get("attachment")
            if not message_text and not attachment:
                return JsonResponse({"error": "Message or attachment is required"}, status=400)
            
            msg = AgentAdminMessage.objects.create(
                agent_id=agent_id,
                application_id=app_id,
                message=message_text,
                attachment=attachment,
                is_from_admin=False
            )
            return JsonResponse({
                "id": msg.id,
                "message": msg.message,
                "is_from_admin": msg.is_from_admin,
                "created_at": msg.created_at.isoformat(),
                "attachment": msg.attachment.url if msg.attachment else None
            }, status=201)
        except Exception as e:
            print("ERROR IN agent_admin_messages POST:", str(e))
            import traceback
            traceback.print_exc()
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)

@csrf_exempt
@agent_required
def agent_start_delivery(request, agent_id, assignment_id):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST allowed"}, status=405)

    try:
        import json
        from .models import AgentAssignment, TrackingHistory
        data = json.loads(request.body)
        
        courier_partner = data.get("courier_partner")
        tracking_id = data.get("tracking_id")
        tracking_url = data.get("tracking_url")
        dispatch_date = data.get("dispatch_date")
        expected_delivery_date = data.get("expected_delivery_date")
        delivery_remarks = data.get("delivery_remarks")

        if not courier_partner or not tracking_id or not dispatch_date:
            return JsonResponse({"error": "Courier Partner, Tracking ID, and Dispatch Date are required."}, status=400)

        assignment = AgentAssignment.objects.get(id=assignment_id, agent_id=agent_id)
        
        assignment.courier_partner = courier_partner
        assignment.tracking_id = tracking_id
        assignment.tracking_url = tracking_url
        assignment.dispatch_date = dispatch_date
        assignment.expected_delivery_date = expected_delivery_date or None
        assignment.delivery_remarks = delivery_remarks
        assignment.status = "DELIVERY_ASSIGNED"
        assignment.save()

        TrackingHistory.objects.create(
            application=assignment.application,
            status="Delivery Started",
            description=f"Courier: {courier_partner} | Tracking ID: {tracking_id}"
        )

        return JsonResponse({"message": "Delivery details saved successfully!"}, status=200)

    except AgentAssignment.DoesNotExist:
        return JsonResponse({"error": "Assignment not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def admin_all_conversations(request):
    """Returns a list of all active conversations, both app-specific and general."""
    try:
        from .models import AgentAdminMessage, AgentAssignment, Agent
        from django.db.models import Count, Q
        
        # 1. Fetch Assignments
        assignments = AgentAssignment.objects.select_related('application', 'agent').all()
        
        # 2. Find general chats
        general_messages = AgentAdminMessage.objects.filter(application__isnull=True).values('agent_id').distinct()
        general_agent_ids = [m['agent_id'] for m in general_messages]
        
        results = []
        for a in assignments:
            if not a.agent: continue
            unread_count = AgentAdminMessage.objects.filter(
                application=a.application, agent=a.agent, is_from_admin=False, is_read=False
            ).count()
            
            results.append({
                "id": f"app-{a.id}",
                "application_id": a.application.id,
                "application_display_id": a.application.application_id,
                "applicant_name": a.application.fullName,
                "agent": {
                    "id": a.agent.id,
                    "name": a.agent.name,
                },
                "unread_count_admin": unread_count,
                "type": "app"
            })
            
        for agent_id in general_agent_ids:
            agent = Agent.objects.get(id=agent_id)
            unread_count = AgentAdminMessage.objects.filter(
                application__isnull=True, agent_id=agent_id, is_from_admin=False, is_read=False
            ).count()
            
            results.append({
                "id": f"gen-{agent_id}",
                "application_id": "general",
                "application_display_id": "General Support",
                "applicant_name": "General Query",
                "agent": {
                    "id": agent.id,
                    "name": agent.name,
                },
                "unread_count_admin": unread_count,
                "type": "general"
            })
            
        # Add any agent who doesn't have a chat yet but is an agent? 
        # For simplicity, if they start a chat, it shows up here.
            
        return JsonResponse(results, safe=False)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
def admin_general_messages(request, agent_id):
    try:
        from .models import AgentAdminMessage, Agent
        agent = Agent.objects.get(id=agent_id)
    except Agent.DoesNotExist:
        return JsonResponse({"error": "Agent not found"}, status=404)

    if request.method == "GET":
        messages = AgentAdminMessage.objects.filter(agent=agent, application__isnull=True).order_by('created_at')
        messages.filter(is_from_admin=False, is_read=False).update(is_read=True)

        data = [{
            "id": m.id,
            "message": m.message,
            "is_from_admin": m.is_from_admin,
            "created_at": m.created_at.isoformat(),
            "attachment": m.attachment.url if m.attachment else None,
            "is_read": m.is_read
        } for m in messages]
        
        agent_details = {
            "id": agent.id,
            "name": agent.name,
            "phone": agent.mobile,
            "email": agent.email,
            "area": agent.location,
            "employee_id": agent.employee_id
        }

        return JsonResponse({
            "messages": data,
            "application_details": {"id": "General", "customer_name": "N/A", "status": "Active"},
            "agent_details": agent_details
        })

    elif request.method == "POST":
        message_text = request.POST.get("message", "").strip()
        attachment = request.FILES.get("attachment")
        if not message_text and not attachment:
            return JsonResponse({"error": "Message or attachment is required"}, status=400)
        
        msg = AgentAdminMessage.objects.create(
            agent=agent,
            application=None,
            message=message_text,
            attachment=attachment,
            is_from_admin=True
        )
        return JsonResponse({
            "id": msg.id,
            "message": msg.message,
            "is_from_admin": msg.is_from_admin,
            "created_at": msg.created_at.isoformat(),
            "attachment": msg.attachment.url if msg.attachment else None
        }, status=201)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
@agent_required
def agent_general_messages(request, agent_id):
    if request.method == "GET":
        from .models import AgentAdminMessage, Agent
        agent = Agent.objects.get(id=agent_id)
        messages = AgentAdminMessage.objects.filter(agent_id=agent_id, application__isnull=True).order_by('created_at')
        unread = messages.filter(is_from_admin=True, is_read=False)
        if unread.exists():
            unread.update(is_read=True)
        
        data = [{
            "id": m.id,
            "message": m.message,
            "is_from_admin": m.is_from_admin,
            "created_at": m.created_at.isoformat(),
            "attachment": m.attachment.url if m.attachment else None,
            "is_read": m.is_read
        } for m in messages]
        
        agent_details = {
            "id": agent.id,
            "name": agent.name,
            "phone": agent.mobile,
            "email": agent.email,
            "area": agent.location,
            "employee_id": agent.employee_id
        }
        return JsonResponse({
            "messages": data,
            "application_details": {"id": "General", "customer_name": "N/A", "status": "Active"},
            "agent_details": agent_details
        })

    elif request.method == "POST":
        try:
            from .models import AgentAdminMessage
            message_text = request.POST.get("message", "").strip()
            attachment = request.FILES.get("attachment")
            if not message_text and not attachment:
                return JsonResponse({"error": "Message or attachment is required"}, status=400)
            
            msg = AgentAdminMessage.objects.create(
                agent_id=agent_id,
                application=None,
                message=message_text,
                attachment=attachment,
                is_from_admin=False
            )
            return JsonResponse({
                "id": msg.id,
                "message": msg.message,
                "is_from_admin": msg.is_from_admin,
                "created_at": msg.created_at.isoformat(),
                "attachment": msg.attachment.url if msg.attachment else None
            }, status=201)
        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)
