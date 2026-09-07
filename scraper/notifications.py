"""
Email notification system for deadline reminders and opportunity alerts.
"""
import os
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scraper.notifications")

# Environment variables
RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
EMAIL_FROM = os.environ.get("EMAIL_FROM", "Opportune <onboarding@resend.dev>")
NEXT_PUBLIC_SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """
    Send an email using Resend API.
    Returns True if successful, False otherwise.
    """
    if not RESEND_API_KEY:
        logger.error("RESEND_API_KEY not configured")
        return False
    
    try:
        response = requests.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": EMAIL_FROM,
                "to": to_email,
                "subject": subject,
                "html": html_content,
            },
            timeout=30,
        )
        
        if response.status_code == 200:
            logger.info(f"Email sent successfully to {to_email}")
            return True
        else:
            logger.error(f"Failed to send email: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        logger.error(f"Error sending email: {e}")
        return False

def send_deadline_reminder(user_email: str, opportunities: List[Dict[str, Any]]) -> bool:
    """
    Send deadline reminder email to a user.
    """
    if not opportunities:
        return False
    
    subject = f"⏰ {len(opportunities)} Opportunity Deadline(s) Coming Up!"
    
    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }}
            .opportunity {{ background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #4F46E5; }}
            .deadline {{ color: #dc2626; font-weight: bold; }}
            .cta {{ background: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Opportune Deadline Reminders</h1>
            </div>
            <div class="content">
                <p>Hello,</p>
                <p>You have {len(opportunities)} opportunity deadline(s) coming up soon:</p>
                
                {"".join([f"""
                <div class="opportunity">
                    <h3>{opp.get('title', 'Unknown Opportunity')}</h3>
                    <p><strong>Deadline:</strong> <span class="deadline">{opp.get('deadline', 'Not specified')}</span></p>
                    <p><strong>Type:</strong> {opp.get('type', 'Other')}</p>
                    {opp.get('organizer') and f"<p><strong>Organizer:</strong> {opp.get('organizer')}</p>"}
                    {opp.get('location') and f"<p><strong>Location:</strong> {opp.get('location')}</p>"}
                    {opp.get('application_url') and f"<a href=\"{opp.get('application_url')}\" class=\"cta\">Apply Now</a>"}
                    {opp.get('source_url') and not opp.get('application_url') and f"<a href=\"{opp.get('source_url')}\" class=\"cta\">View Details</a>"}
                </div>
                """ for opp in opportunities])}
                
                <p>Don't miss these opportunities! Good luck with your applications.</p>
                <p>Best,<br>The Opportune Team</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(user_email, subject, html_content)

def send_new_opportunities_alert(user_email: str, opportunities: List[Dict[str, Any]], user_interests: List[str]) -> bool:
    """
    Send email alert about new opportunities matching user's interests.
    """
    if not opportunities:
        return False
    
    subject = f"🎯 {len(opportunities)} New Opportunities Match Your Profile"

    interests_text = ", ".join(user_interests[:3]) if user_interests else "your interests"

    opportunity_rows = ""
    for opp in opportunities:
        row = f"""
                <div class="opportunity">
                    <h3>{opp.get('title', 'Unknown Opportunity')}</h3>
                    <p><strong>Type:</strong> {opp.get('type', 'Other')}</p>
                    <p class="tags"><strong>Tags:</strong> {', '.join(opp.get('field_tags', []))}</p>"""
        if opp.get('deadline'):
            row += f"""
                    <p><strong>Deadline:</strong> {opp['deadline']}</p>"""
        if opp.get('organizer'):
            row += f"""
                    <p><strong>Organizer:</strong> {opp['organizer']}</p>"""
        if opp.get('location'):
            row += f"""
                    <p><strong>Location:</strong> {opp['location']}</p>"""
        link = opp.get('application_url') or opp.get('source_url')
        if link:
            label = "Apply Now" if opp.get('application_url') else "View Details"
            row += f"""
                    <a href="{link}" class="cta">{label}</a>"""
        row += """
                </div>"""
        opportunity_rows += row

    html_content = f"""
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: #10B981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }}
            .content {{ background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }}
            .opportunity {{ background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #10B981; }}
            .tags {{ color: #10B981; font-size: 0.9em; }}
            .cta {{ background: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>New Opportunities on Opportune</h1>
            </div>
            <div class="content">
                <p>Hello,</p>
                <p>We found {len(opportunities)} new opportunities matching {interests_text}:</p>

                {opportunity_rows}

                <p>Check your Opportune dashboard to save these opportunities to your tracker!</p>
                <p>Best,<br>The Opportune Team</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(user_email, subject, html_content)

def get_users_with_upcoming_deadlines(days_ahead: int = 7) -> List[Dict[str, Any]]:
    """
    Get users who have tracked opportunities with deadlines coming up.
    Returns list of users with their upcoming opportunities.
    """
    if not NEXT_PUBLIC_SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
        logger.error("Supabase credentials not configured")
        return []
    
    try:
        # Calculate the date range
        from_date = datetime.now().isoformat()
        to_date = (datetime.now() + timedelta(days=days_ahead)).isoformat()
        
        # Query Supabase for users with upcoming deadlines
        # This would typically be done via Supabase client, but for this example
        # we'll return a placeholder structure
        logger.info(f"Querying users with deadlines between {from_date} and {to_date}")
        
        # Placeholder - in production, use actual Supabase query
        return []
        
    except Exception as e:
        logger.error(f"Error querying upcoming deadlines: {e}")
        return []

def send_deadline_reminders_batch(days_ahead: int = 7) -> int:
    """
    Send deadline reminders to all users with upcoming deadlines.
    Returns the number of emails sent successfully.
    """
    users_with_deadlines = get_users_with_upcoming_deadlines(days_ahead)
    
    sent_count = 0
    for user_data in users_with_deadlines:
        user_email = user_data.get('email')
        opportunities = user_data.get('opportunities', [])
        
        if user_email and opportunities:
            if send_deadline_reminder(user_email, opportunities):
                sent_count += 1
    
    logger.info(f"Sent {sent_count} deadline reminder emails")
    return sent_count

if __name__ == "__main__":
    # Test email notification system
    logger.info("Testing email notification system...")
    
    # Test deadline reminder
    test_opportunities = [
        {
            "title": "AI Research Internship 2026",
            "type": "research",
            "deadline": "2026-09-15T23:59:59Z",
            "organizer": "Google",
            "location": "Remote",
            "application_url": "https://example.com/apply",
        }
    ]
    
    if RESEND_API_KEY:
        send_deadline_reminder("test@example.com", test_opportunities)
    else:
        logger.warning("RESEND_API_KEY not set, skipping email test")