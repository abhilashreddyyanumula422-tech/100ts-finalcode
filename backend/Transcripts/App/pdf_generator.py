import os
from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from django.core.files.base import ContentFile
from django.utils import timezone

def generate_invoice_pdf(invoice):
    """
    Generates a PDF invoice for a given Invoice object and saves it to the object.
    Returns the Invoice object.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = []

    # Title
    elements.append(Paragraph("<b>100 Transcripts - Payment Invoice</b>", styles['Title']))
    elements.append(Spacer(1, 20))

    # Basic Info
    app = invoice.application
    customer_name = app.fullName
    customer_email = app.email
    customer_phone = app.phone
    
    # Text data
    elements.append(Paragraph(f"<b>Invoice Number:</b> {invoice.invoice_number}", styles['Normal']))
    elements.append(Paragraph(f"<b>Date:</b> {timezone.localtime(invoice.created_at).strftime('%Y-%m-%d %H:%M')}", styles['Normal']))
    elements.append(Paragraph(f"<b>Application ID:</b> {app.application_id}", styles['Normal']))
    elements.append(Paragraph(f"<b>Transaction ID:</b> {invoice.payment.order_id}", styles['Normal']))
    elements.append(Spacer(1, 15))

    # Customer Info
    elements.append(Paragraph("<b>Customer Details:</b>", styles['Heading3']))
    elements.append(Paragraph(f"Name: {customer_name}", styles['Normal']))
    elements.append(Paragraph(f"Email: {customer_email}", styles['Normal']))
    elements.append(Paragraph(f"Phone: {customer_phone}", styles['Normal']))
    elements.append(Spacer(1, 15))

    # Payment Details Table
    elements.append(Paragraph("<b>Payment Details:</b>", styles['Heading3']))
    
    table_data = [
        ["Service/Requirement", "Amount Paid (INR)", "Status"]
    ]
    
    table_data.append([
        app.requirement,
        str(invoice.amount_paid),
        "PAID"
    ])
    
    table = Table(table_data, colWidths=[250, 150, 100])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 30))
    
    elements.append(Paragraph("Thank you for choosing 100 Transcripts!", styles['Normal']))

    # Build PDF
    doc.build(elements)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()

    # Save to model
    filename = f"{invoice.invoice_number}.pdf"
    invoice.pdf_file.save(filename, ContentFile(pdf_bytes), save=True)
    
    return invoice
