import datetime

class ActionManager:
    def __init__(self):
        self.logs = []

    def execute_logic(self, ai_text):
        """Analyze AI text to trigger API actions"""
        action_triggered = None
        if "BOOK" in ai_text.upper():
            action_triggered = f"📅 API CALL: Google Calendar - Appointment set for {datetime.date.today()}"
        elif "ORDER" in ai_text.upper():
            action_triggered = "🛒 API CALL: Shopify - Creating order..."
        
        if action_triggered:
            self.logs.append(action_triggered)
            return action_triggered
        return None