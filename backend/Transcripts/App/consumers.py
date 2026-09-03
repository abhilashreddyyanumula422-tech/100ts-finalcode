import json
from urllib.parse import parse_qs

from channels.generic.websocket import AsyncWebsocketConsumer
from django.core import signing

from .redis_chat import save_message
from .utils import ADMIN_TOKEN_SALT, ADMIN_TOKEN_MAX_AGE
from .views_agent import AGENT_TOKEN_SALT, AGENT_TOKEN_MAX_AGE


def _verify_agent_token(token):
    if not token:
        return None
    try:
        payload = signing.loads(token, salt=AGENT_TOKEN_SALT, max_age=AGENT_TOKEN_MAX_AGE)
    except (signing.SignatureExpired, signing.BadSignature):
        return None
    return payload.get("agent_id")


def _verify_admin_token(token):
    if not token:
        return None
    try:
        payload = signing.loads(token, salt=ADMIN_TOKEN_SALT, max_age=ADMIN_TOKEN_MAX_AGE)
    except (signing.SignatureExpired, signing.BadSignature):
        return None
    return payload.get("admin_id")


class AdminAgentConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        # Get agent ID from URL
        self.agent_id = self.scope["url_route"]["kwargs"]["agent_id"]

        # Get application ID from URL.
        # For general chat this will be None.
        self.application_id = self.scope["url_route"]["kwargs"].get("app_id")


        # ── AUTH ──
        # Browsers can't set custom headers on a WebSocket handshake,
        # so the token travels as ?token=... in the connection URL.
        query = parse_qs(self.scope.get("query_string", b"").decode())
        token = (query.get("token") or [None])[0]

        agent_id_in_token = _verify_agent_token(token)
        admin_id_in_token = None
        if agent_id_in_token is None:
            admin_id_in_token = _verify_admin_token(token)

        is_valid_agent = (
            agent_id_in_token is not None
            and str(agent_id_in_token) == str(self.agent_id)
        )
        is_valid_admin = admin_id_in_token is not None

        if not (is_valid_agent or is_valid_admin):
            await self.close(code=4401)
            return

        self.is_admin_conn = is_valid_admin

        # Create a separate WebSocket room for each chat
        if self.application_id:
            self.room_group_name = (
                f"agent_{self.agent_id}_app_{self.application_id}"
            )
        else:
            self.room_group_name = (
                f"agent_{self.agent_id}_general"
            )

        print("====================================")
        print("WEBSOCKET CONNECTED")
        print("Agent ID:", self.agent_id)
        print("Application ID:", self.application_id)
        print("Room:", self.room_group_name)
        print("====================================")

        # Join the WebSocket room
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # Accept WebSocket connection
        await self.accept()

        # Tell frontend that connection succeeded
        await self.send(text_data=json.dumps({
            "type": "connection",
            "message": "WebSocket connected",
            "agent_id": self.agent_id,
            "application_id": self.application_id,
        }))

    async def disconnect(self, close_code):
        if not hasattr(self, "room_group_name"):
            return  # never joined a room (rejected in connect())

        print("====================================")
        print("WEBSOCKET DISCONNECTED")
        print("Agent ID:", self.agent_id)
        print("Application ID:", self.application_id)
        print("Close code:", close_code)
        print("====================================")

        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):

        print("====================================")
        print("WEBSOCKET MESSAGE RECEIVED")
        print("RAW DATA:", text_data)
        print("====================================")

        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            print("Invalid JSON")
            return

        message = data.get("message", "").strip()

        if not message:
            print("Empty message")
            return

        # -----------------------------------------
        # Application ID
        # -----------------------------------------
        application_id = self.application_id

        if application_id:
            application_id = int(application_id)

        # -----------------------------------------
        # Who sent the message?
        #
        # Agent  -> False
        # Admin  -> True
        # -----------------------------------------
        # Trust the verified connection type, not client input —
        # otherwise an agent's browser tab could set
        # is_from_admin: true and impersonate the admin.
        is_from_admin = bool(self.is_admin_conn)

        print("Agent ID:", self.agent_id)
        print("Application ID:", application_id)
        print("Message:", message)
        print("From Admin:", is_from_admin)

        # -----------------------------------------
        # SAVE MESSAGE TO REDIS
        # -----------------------------------------
        chat_message = save_message(
            agent_id=self.agent_id,
            application_id=application_id,
            message=message,
            is_from_admin=is_from_admin,
        )

        print("====================================")
        print("MESSAGE SAVED TO REDIS")
        print(chat_message)
        print("====================================")

        # -----------------------------------------
        # SEND MESSAGE TO EVERYONE
        # IN THIS CHAT ROOM
        # -----------------------------------------
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": chat_message,
                "agent_id": self.agent_id,
                "application_id": application_id,
            }
        )

    async def chat_message(self, event):

        print("Sending message to WebSocket client")

        await self.send(text_data=json.dumps({
            "type": "message",
            "message": event["message"],
            "agent_id": event["agent_id"],
            "application_id": event.get("application_id"),
        }))