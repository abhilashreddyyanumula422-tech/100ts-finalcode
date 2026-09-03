# import logging
# import requests
# from django.core.mail import send_mail
# from django.conf import settings

# logger = logging.getLogger(__name__)

# def format_phone_number(phone):
#     """
#     Cleans phone number for WhatsApp Interakt API.
#     Extracts the 10 digit number and uses +91 for India.
#     """
#     if not phone:
#         return None
#     cleaned = ''.join(filter(str.isdigit, str(phone)))
#     if len(cleaned) == 10:
#         return cleaned
#     elif len(cleaned) > 10 and cleaned.startswith("91"):
#         return cleaned[2:]
#     elif len(cleaned) > 10 and cleaned.startswith("0"):
#         return cleaned[-10:]
#     return None

# def send_interakt_template(phone_number, template_name, variables=None, application_id=None, customer_name=None, status=None):
#     """
#     Sends a WhatsApp message using the Interakt API.
#     Properly handles exceptions and logs all outcomes.
#     """
#     if not settings.WHATSAPP_ENABLED:
#         logger.info(f"WhatsApp disabled. Skipping message to {phone_number} (Template: {template_name})")
#         return False

#     valid_phone = format_phone_number(phone_number)
#     if not valid_phone:
#         logger.warning(f"WhatsApp API skipped: Invalid phone number provided -> {phone_number}")
#         return False

#     api_key = getattr(settings, "INTERAKT_SECRET_KEY", None)
#     if not api_key:
#         logger.warning("WhatsApp API skipped: INTERAKT_SECRET_KEY missing in environment variables.")
#         return False

#     url = settings.INTERAKT_BASE_URL
#     headers = {
#         "Authorization": f"Basic {api_key}",
#         "Content-Type": "application/json"
#     }
    
#     payload = {
#         "countryCode": "+91",
#         "phoneNumber": valid_phone,
#         "type": "Template",
#         "template": {
#             "name": template_name,
#             "languageCode": "en",
#             "bodyValues": [str(val) for val in (variables or [])]
#         }
#     }

#     # Logging before sending
#     masked_key = api_key[:5] + "***" if api_key else "None"
#     print("\n" + "="*50)
#     print("WhatsApp Notification Triggered")
#     print(f"Application ID: {application_id or 'N/A'}")
#     print(f"Customer: {customer_name or (variables[0] if variables else 'N/A')}")
#     print(f"Phone: {valid_phone}")
#     print(f"Status: {status or 'N/A'}")
#     print(f"Template: {template_name}")
#     print(f"Payload: {payload}")
#     print(f"API URL: {url}")
#     print(f"Request Headers: {{'Authorization': 'Basic {masked_key}', 'Content-Type': 'application/json'}}")
    
#     try:
#         response = requests.post(url, headers=headers, json=payload, timeout=5)
#         print(f"Interakt Response Code: {response.status_code}")
#         print(f"Interakt Response Body: {response.text}")
#         print("="*50 + "\n")
        
#         if response.status_code in [200, 201, 202]:
#             return True
            
#         logger.error(f"WhatsApp API Error: {response.text}")
#         return False
        
#     except Exception as e:
#         print(f"Interakt Response Error: {str(e)}")
#         print("="*50 + "\n")
#         logger.error(f"WhatsApp API Exception for {valid_phone}: {str(e)}")
#         return False

# def send_notification_helper(email, phone, subject, message, whatsapp_template=None, whatsapp_data=None):
#     """
#     Shared helper to send both Email and WhatsApp notifications.
#     Catches exceptions so it doesn't break the main flow.
#     """
#     # 1. Send Email
#     if email:
#         try:
#             send_mail(
#                 subject=subject,
#                 message=message,
#                 from_email=settings.EMAIL_HOST_USER,
#                 recipient_list=[email],
#                 fail_silently=False,
#             )
#             print(f"✅ Email sent successfully to {email}")
#         except Exception as e:
#             print(f"❌ Failed to send email to {email}: {str(e)}")
#             logger.error(f"Email failure: {str(e)}")
            
#     # 2. Send WhatsApp
#     if phone and whatsapp_template:
#         send_interakt_template(phone, whatsapp_template, whatsapp_data)





import logging
import requests
from django.core.mail import send_mail
from django.conf import settings
from django.core import signing

logger = logging.getLogger(__name__)

# =================================================================
# ADMIN AUTH TOKENS
#
# Admin login previously issued no token at all — every
# "Authorization: Token ..." header the frontend sent had nothing
# real behind it. These functions issue and verify a stateless,
# signed token for Admin, using the same pattern already used for
# Agent tokens (see views_agent.py: AGENT_TOKEN_SALT / make_agent_token).
# =================================================================

ADMIN_TOKEN_SALT = "100ts.admin.portal.v1"
ADMIN_TOKEN_MAX_AGE = 60 * 60 * 24 * 7  # 7 days


def make_admin_token(admin):
    """Stateless, tamper-proof token for Admin — issued at login."""
    return signing.dumps(
        {"admin_id": admin.id, "email": admin.email},
        salt=ADMIN_TOKEN_SALT,
    )


def verify_admin_token(token):
    """Returns admin_id if the raw token string is valid, else None."""
    if not token:
        return None
    try:
        payload = signing.loads(
            token, salt=ADMIN_TOKEN_SALT, max_age=ADMIN_TOKEN_MAX_AGE
        )
    except (signing.SignatureExpired, signing.BadSignature):
        return None
    return payload.get("admin_id")


def admin_id_from_token(request):
    """Reads Authorization: Token <token> / Bearer <token> from an HTTP request."""
    raw = (request.headers.get("Authorization") or "").strip()
    if raw.lower().startswith("token "):
        raw = raw[6:].strip()
    elif raw.lower().startswith("bearer "):
        raw = raw[7:].strip()
    return verify_admin_token(raw)







from functools import wraps
from django.http import JsonResponse

def admin_required(view_func):
    """
    Gate any admin-only endpoint. Mirrors agent_required in views_agent.py.

      no/expired token -> 401 AUTH_REQUIRED
      otherwise         -> request.admin_id is set, view runs
    """
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        admin_id = admin_id_from_token(request)
        if admin_id is None:
            return JsonResponse(
                {"error": "Authentication required. Please sign in again.",
                 "code": "AUTH_REQUIRED"},
                status=401,
            )
        request.admin_id = admin_id
        return view_func(request, *args, **kwargs)
    return _wrapped







# =================================================================
# WHATSAPP / EMAIL NOTIFICATIONS — unchanged from original
# =================================================================

def format_phone_number(phone):
    """
    Cleans phone number for WhatsApp Interakt API.
    Extracts the 10 digit number and uses +91 for India.
    """
    if not phone:
        return None
    cleaned = ''.join(filter(str.isdigit, str(phone)))
    if len(cleaned) == 10:
        return cleaned
    elif len(cleaned) > 10 and cleaned.startswith("91"):
        return cleaned[2:]
    elif len(cleaned) > 10 and cleaned.startswith("0"):
        return cleaned[-10:]
    return None

def send_interakt_template(phone_number, template_name, variables=None, application_id=None, customer_name=None, status=None):
    """
    Sends a WhatsApp message using the Interakt API.
    Properly handles exceptions and logs all outcomes.
    """
    if not settings.WHATSAPP_ENABLED:
        logger.info(f"WhatsApp disabled. Skipping message to {phone_number} (Template: {template_name})")
        return False

    valid_phone = format_phone_number(phone_number)
    if not valid_phone:
        logger.warning(f"WhatsApp API skipped: Invalid phone number provided -> {phone_number}")
        return False

    api_key = getattr(settings, "INTERAKT_SECRET_KEY", None)
    if not api_key:
        logger.warning("WhatsApp API skipped: INTERAKT_SECRET_KEY missing in environment variables.")
        return False

    url = settings.INTERAKT_BASE_URL
    headers = {
        "Authorization": f"Basic {api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "countryCode": "+91",
        "phoneNumber": valid_phone,
        "type": "Template",
        "template": {
            "name": template_name,
            "languageCode": "en",
            "bodyValues": [str(val) for val in (variables or [])]
        }
    }

    # Logging before sending
    masked_key = api_key[:5] + "***" if api_key else "None"
    print("\n" + "="*50)
    print("WhatsApp Notification Triggered")
    print(f"Application ID: {application_id or 'N/A'}")
    print(f"Customer: {customer_name or (variables[0] if variables else 'N/A')}")
    print(f"Phone: {valid_phone}")
    print(f"Status: {status or 'N/A'}")
    print(f"Template: {template_name}")
    print(f"Payload: {payload}")
    print(f"API URL: {url}")
    print(f"Request Headers: {{'Authorization': 'Basic {masked_key}', 'Content-Type': 'application/json'}}")
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=5)
        print(f"Interakt Response Code: {response.status_code}")
        print(f"Interakt Response Body: {response.text}")
        print("="*50 + "\n")
        
        if response.status_code in [200, 201, 202]:
            return True
            
        logger.error(f"WhatsApp API Error: {response.text}")
        return False
        
    except Exception as e:
        print(f"Interakt Response Error: {str(e)}")
        print("="*50 + "\n")
        logger.error(f"WhatsApp API Exception for {valid_phone}: {str(e)}")
        return False

def send_notification_helper(email, phone, subject, message, whatsapp_template=None, whatsapp_data=None):
    """
    Shared helper to send both Email and WhatsApp notifications.
    Catches exceptions so it doesn't break the main flow.
    """
    # 1. Send Email
    if email:
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.EMAIL_HOST_USER,
                recipient_list=[email],
                fail_silently=False,
            )
            print(f"✅ Email sent successfully to {email}")
        except Exception as e:
            print(f"❌ Failed to send email to {email}: {str(e)}")
            logger.error(f"Email failure: {str(e)}")
            
    # 2. Send WhatsApp
    if phone and whatsapp_template:
        send_interakt_template(phone, whatsapp_template, whatsapp_data)