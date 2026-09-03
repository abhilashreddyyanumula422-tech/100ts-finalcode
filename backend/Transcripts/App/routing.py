from django.urls import re_path

from .consumers import AdminAgentConsumer


websocket_urlpatterns = [

    # ==========================================
    # APPLICATION CHAT
    # Example:
    # ws://127.0.0.1:8000/ws/agent/1/app/25/
    # ==========================================
    re_path(
        r"ws/agent/(?P<agent_id>\d+)/app/(?P<app_id>\d+)/$",
        AdminAgentConsumer.as_asgi(),
    ),


]