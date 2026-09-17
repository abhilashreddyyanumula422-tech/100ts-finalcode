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


from django.core.mail import EmailMessage
from django.db import transaction
import time

def send_invoice_email(invoice):
    app = invoice.application
    subject = f"Payment Successful – Invoice {invoice.invoice_number}"
    
    from django.utils import timezone
    local_time = timezone.localtime(invoice.created_at).strftime('%Y-%m-%d %H:%M')
    
    message = f"""Dear {app.fullName},

Your payment of ₹{invoice.amount_paid} has been received successfully.

Invoice Number: {invoice.invoice_number}
Application ID: {app.application_id}
Service/Certificate: {app.requirement}
Payment Date and Time: {local_time}
Transaction ID: {invoice.payment.order_id}
Payment Status: PAID

Please find your payment invoice attached.

Thank you,
100 Transcripts
"""

    if not app.email:
        return False
        
    try:
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=settings.EMAIL_HOST_USER,
            to=[app.email],
        )
        if invoice.pdf_file:
            pdf_name = f"{invoice.invoice_number}.pdf"
            email.attach(pdf_name, invoice.pdf_file.read(), 'application/pdf')
            email.send(fail_silently=False)
            print(f"✅ Invoice email sent successfully to {app.email}")
            return True
        else:
            print("❌ No PDF found to attach.")
            return False
    except Exception as e:
        print(f"❌ Failed to send invoice email to {app.email}: {str(e)}")
        logger.error(f"Email failure for invoice {invoice.invoice_number}: {str(e)}")
        return False


def send_interakt_document(phone_number, invoice):
    """
    Sends a WhatsApp message with the attached invoice PDF using Interakt API.
    """
    if not settings.WHATSAPP_ENABLED:
        logger.info(f"WhatsApp disabled. Skipping invoice for {phone_number}")
        return False

    valid_phone = format_phone_number(phone_number)
    if not valid_phone:
        return False

    api_key = getattr(settings, "INTERAKT_SECRET_KEY", None)
    if not api_key:
        return False

    url = "https://api.interakt.ai/v1/public/message/"
    headers = {
        "Authorization": f"Basic {api_key}",
        "Content-Type": "application/json"
    }

    pdf_url = ""
    if invoice.pdf_file:
        import os
        domain = os.environ.get("PUBLIC_DOMAIN", "http://127.0.0.1:8000").rstrip('/')
        pdf_path = invoice.pdf_file.url
        if not pdf_path.startswith('/'):
            pdf_path = '/' + pdf_path
        pdf_url = domain + pdf_path

    try:
        media_payload = {
            "countryCode": "+91",
            "phoneNumber": valid_phone,
            "type": "Document",
            "message": f"Payment Successful ✅\n\nInvoice No: {invoice.invoice_number}\n\nYour payment invoice is attached to this WhatsApp message.\n\nThank you,\n100 Transcripts",
            "data": {
                "mediaUrl": pdf_url,
                "filename": f"{invoice.invoice_number}.pdf"
            }
        }
        
        response = requests.post(url, headers=headers, json=media_payload, timeout=5)
        if response.status_code in [200, 201, 202]:
            return True
        logger.error(f"WhatsApp Document API Error: {response.text}")
        return False
    except Exception as e:
        logger.error(f"WhatsApp Document API Exception for {valid_phone}: {str(e)}")
        return False


def process_successful_payment_invoice(payment):
    from .models import Invoice
    from .pdf_generator import generate_invoice_pdf
    
    if Invoice.objects.filter(payment=payment).exists():
        logger.info(f"Invoice already exists for payment {payment.order_id}. Skipping.")
        return Invoice.objects.filter(payment=payment).first()
        
    with transaction.atomic():
        if Invoice.objects.filter(payment=payment).exists():
             return Invoice.objects.filter(payment=payment).first()
             
        year = time.strftime('%Y')
        last_invoice = Invoice.objects.order_by('-id').first()
        if last_invoice:
            last_id = last_invoice.id + 1
        else:
            last_id = 1
        invoice_number = f"INV-{year}-{last_id:06d}"
        
        invoice = Invoice.objects.create(
            invoice_number=invoice_number,
            payment=payment,
            application=payment.application,
            amount_paid=payment.amount
        )
    
    try:
        generate_invoice_pdf(invoice)
    except Exception as e:
        logger.error(f"PDF Generation failed for {invoice.invoice_number}: {str(e)}")
        
    try:
        email_sent = send_invoice_email(invoice)
        if email_sent:
            invoice.email_status = "SENT"
        else:
            invoice.email_status = "FAILED"
    except Exception as e:
        invoice.email_status = "FAILED"
        
    try:
        wa_sent = send_interakt_document(payment.application.phone, invoice)
        if wa_sent:
            invoice.whatsapp_status = "SENT"
        else:
            invoice.whatsapp_status = "FAILED"
    except Exception as e:
        invoice.whatsapp_status = "FAILED"
        
    invoice.save()
    return invoice