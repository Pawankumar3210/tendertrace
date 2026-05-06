from fastapi import APIRouter
from fastapi.responses import FileResponse
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import inch
from reportlab.lib.enums import TA_CENTER, TA_LEFT
import os
from datetime import datetime
from backend.routes.evaluate import evaluations_store
from backend.routes.tender import tender_store

router = APIRouter()

@router.get("/generate")
def generate_report():
    if not evaluations_store:
        return {"error": "No evaluations to report"}

    filename = f"TenderTrace_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    filepath = f"backend/{filename}"

    doc = SimpleDocTemplate(filepath, pagesize=A4,
                           rightMargin=0.5*inch, leftMargin=0.5*inch,
                           topMargin=0.5*inch, bottomMargin=0.5*inch)

    styles = getSampleStyleSheet()
    indigo = HexColor('#4F46E5')
    amber = HexColor('#F59E0B')
    green = HexColor('#10B981')
    red = HexColor('#EF4444')

    title_style = ParagraphStyle('Title', parent=styles['Normal'],
                                  fontSize=20, fontName='Helvetica-Bold',
                                  textColor=indigo, alignment=TA_CENTER, spaceAfter=6)
    sub_style = ParagraphStyle('Sub', parent=styles['Normal'],
                                fontSize=10, textColor=HexColor('#6B7280'),
                                alignment=TA_CENTER, spaceAfter=20)
    section_style = ParagraphStyle('Section', parent=styles['Normal'],
                                    fontSize=13, fontName='Helvetica-Bold',
                                    textColor=indigo, spaceBefore=14, spaceAfter=6)
    body_style = ParagraphStyle('Body', parent=styles['Normal'],
                                 fontSize=9, textColor=HexColor('#374151'), spaceAfter=4)

    story = []
    tender = tender_store.get("current", {})

    story.append(Paragraph("TenderTrace AI", title_style))
    story.append(Paragraph("Automated Tender Evaluation Report", sub_style))
    story.append(Paragraph(f"Tender: {tender.get('title', 'N/A')}", section_style))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%d %B %Y, %I:%M %p')}", body_style))
    story.append(Spacer(1, 0.2*inch))

    eligible = len([e for e in evaluations_store if e["overall_status"] == "Eligible"])
    not_eligible = len([e for e in evaluations_store if e["overall_status"] == "Not Eligible"])
    needs_review = len([e for e in evaluations_store if e["overall_status"] == "Needs Review"])

    summary_data = [
        ["Total Bidders", "Eligible", "Not Eligible", "Needs Review"],
        [str(len(evaluations_store)), str(eligible), str(not_eligible), str(needs_review)]
    ]
    summary_table = Table(summary_data, colWidths=[1.8*inch]*4)
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), indigo),
        ('TEXTCOLOR', (0,0), (-1,0), white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 10),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [HexColor('#F9FAFB'), white]),
        ('GRID', (0,0), (-1,-1), 0.5, HexColor('#E5E7EB')),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 0.3*inch))

    for evaluation in evaluations_store:
        status_color = green if evaluation["overall_status"] == "Eligible" else \
                      red if evaluation["overall_status"] == "Not Eligible" else amber

        story.append(Paragraph(f"Bidder: {evaluation['bidder_name']}", section_style))

        status_data = [["Overall Status", "Confidence Score"],
                      [evaluation["overall_status"], f"{evaluation['overall_confidence']}%"]]
        status_table = Table(status_data, colWidths=[3.5*inch, 3.5*inch])
        status_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), HexColor('#F3F4F6')),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('TEXTCOLOR', (0,1), (0,1), status_color),
            ('FONTNAME', (0,1), (0,1), 'Helvetica-Bold'),
            ('GRID', (0,0), (-1,-1), 0.5, HexColor('#E5E7EB')),
            ('PADDING', (0,0), (-1,-1), 7),
        ]))
        story.append(status_table)
        story.append(Spacer(1, 0.1*inch))

        criteria_data = [["Criterion", "Status", "Confidence", "Found Value", "Explanation"]]
        for cr in evaluation["criteria_results"]:
            criteria_data.append([
                cr["criterion_name"],
                cr["status"],
                f"{cr['confidence']}%",
                cr["found_value"][:30] + "..." if len(cr["found_value"]) > 30 else cr["found_value"],
                cr["explanation"][:80] + "..." if len(cr["explanation"]) > 80 else cr["explanation"]
            ])

        col_widths = [1.4*inch, 0.8*inch, 0.7*inch, 1.3*inch, 2.8*inch]
        criteria_table = Table(criteria_data, colWidths=col_widths)
        criteria_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), indigo),
            ('TEXTCOLOR', (0,0), (-1,0), white),
            ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
            ('FONTSIZE', (0,0), (-1,-1), 7),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('ROWBACKGROUNDS', (0,1), (-1,-1), [HexColor('#F9FAFB'), white]),
            ('GRID', (0,0), (-1,-1), 0.5, HexColor('#E5E7EB')),
            ('PADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(criteria_table)
        story.append(Spacer(1, 0.2*inch))

    story.append(Spacer(1, 0.3*inch))
    story.append(Paragraph("This report was generated automatically by TenderTrace AI. All verdicts must be reviewed and signed off by an authorized procurement officer before use in official proceedings.", 
                           ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, 
                                         textColor=HexColor('#9CA3AF'), alignment=TA_CENTER)))

    doc.build(story)
    return FileResponse(filepath, media_type="application/pdf", filename=filename)