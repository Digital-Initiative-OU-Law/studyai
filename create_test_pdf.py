from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

def create_test_pdf():
    c = canvas.Canvas("test_document.pdf", pagesize=letter)
    width, height = letter
    
    # Add some text
    c.setFont("Helvetica-Bold", 24)
    c.drawString(100, height - 100, "Test Legal Document")
    
    c.setFont("Helvetica", 14)
    c.drawString(100, height - 150, "Chapter 1: Introduction to Constitutional Law")
    
    c.setFont("Helvetica", 12)
    text = [
        "This is a test document for the StudyAI system.",
        "It contains sample legal content that would normally be",
        "part of weekly readings for law students.",
        "",
        "The Constitution of the United States establishes the",
        "framework for the federal government and sets forth",
        "fundamental rights and liberties.",
        "",
        "Key principles include:",
        "- Separation of powers",
        "- Federalism", 
        "- Individual rights",
        "- Due process",
        "",
        "This document is being used to test the PDF upload",
        "and ingestion functionality of the StudyAI platform."
    ]
    
    y_position = height - 200
    for line in text:
        c.drawString(100, y_position, line)
        y_position -= 20
    
    c.save()
    print("Test PDF created: test_document.pdf")

if __name__ == "__main__":
    create_test_pdf()