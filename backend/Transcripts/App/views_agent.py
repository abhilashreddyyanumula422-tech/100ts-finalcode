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

from .models import Agent, AgentAssignment, Application


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


def assignment_to_dict(assignment):
    app = assignment.application
    agent = assignment.agent
    first_degree = app.degrees.first()
    university = first_degree.university if first_degree else "N/A"

    return {
        "id": assignment.id,
        "application_id": app.id,
        "application_display_id": f"REQ-{app.id:03}",
        "applicant_name": app.fullName,
        "phone": app.phone,
        "email": app.email,
        "requirement": app.requirement,
        "university": university,
        "app_status": app.status,
        "payment_status": app.payment_status,
        "agent": agent_to_dict(agent) if agent else None,
        "status": assignment.status,
        "assigned_at": assignment.assigned_at.isoformat(),
        "accepted_at": assignment.accepted_at.isoformat() if assignment.accepted_at else None,
        "completed_at": assignment.completed_at.isoformat() if assignment.completed_at else None,
        "agent_rejection_reason": assignment.agent_rejection_reason,
        "progress_note": assignment.progress_note,
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
        AgentAssignment.objects.filter(application=app).delete()

        assignment = AgentAssignment.objects.create(
            application=app,
            agent=agent,
            status="DELIVERY_ASSIGNED"
        )
        TrackingHistory.objects.create(
            application=app,
            status="DELIVERY_ASSIGNED",
            description=f"Delivery assigned to agent: {agent.name}"
        )

        # Notify agent via WhatsApp
        try:
            from .utils import send_interakt_template
            send_interakt_template(
                phone_number=agent.mobile,
                template_name="agent_assigned",
                variables=[agent.name, app.fullName, f"REQ-{app.id:03}"],
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
        AgentAssignment.objects.filter(application=app).delete()
        assignment = AgentAssignment.objects.create(
            application=app,
            agent=best_agent,
            status="DELIVERY_ASSIGNED"
        )
        TrackingHistory.objects.create(
            application=app,
            status="DELIVERY_ASSIGNED",
            description=f"Delivery assigned to agent: {best_agent.name}"
        )

        try:
            from .utils import send_interakt_template
            send_interakt_template(
                phone_number=best_agent.mobile,
                template_name="agent_assigned",
                variables=[best_agent.name, app.fullName, f"REQ-{app.id:03}"],
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
    """Get the current assignment for a specific application."""
    try:
        assignment = AgentAssignment.objects.get(application_id=app_id)
        return Response(assignment_to_dict(assignment))
    except AgentAssignment.DoesNotExist:
        return Response({"assignment": None})


# ─────────────────────────────────────────────────────────────
# AGENT — THEIR ASSIGNMENTS
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
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

        # Notify admin via WhatsApp
        try:
            from .utils import send_interakt_template
            app = assignment.application
            send_interakt_template(
                phone_number=assignment.agent.mobile,
                template_name="agent_accepted",
                variables=[assignment.agent.name, app.fullName, f"REQ-{app.id:03}"],
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

        # Notify admin
        try:
            from .utils import send_interakt_template
            app = assignment.application
            send_interakt_template(
                phone_number=old_agent.mobile,
                template_name="agent_rejected",
                variables=[old_agent.name, app.fullName, f"REQ-{app.id:03}", reason],
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
def agent_update_status(request, agent_id, assignment_id):
    """Agent updates their progress status."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    VALID_TRANSITIONS = {
        "ACCEPTED": ["IN_PROGRESS"],
        "IN_PROGRESS": ["DOCUMENTS_COLLECTED"],
        "DOCUMENTS_COLLECTED": ["SUBMITTED_TO_UNIVERSITY"],
        "SUBMITTED_TO_UNIVERSITY": ["COMPLETED"],
    }

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

        # Notify
        try:
            from .utils import send_interakt_template
            app = assignment.application
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
