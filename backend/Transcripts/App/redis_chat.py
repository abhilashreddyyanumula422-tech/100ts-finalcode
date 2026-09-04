import uuid
from django.core.cache import cache
from datetime import datetime, timezone


MAX_MESSAGES = 1000
MESSAGE_TTL = 60 * 60 * 24 * 7  # 7 days


def get_chat_key(agent_id, application_id=None):
    if application_id:
        return f"chat:agent:{agent_id}:app:{application_id}"

    return f"chat:agent:{agent_id}:general"


def save_message(
    agent_id,
    message,
    is_from_admin,
    application_id=None,
    attachment=None,
):
    key = get_chat_key(agent_id, application_id)

    chat_message = {
        "id": str(uuid.uuid4()),
        "message": message,
        "is_from_admin": is_from_admin,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "attachment": attachment,
    }

    messages = cache.get(key, [])

    messages.append(chat_message)

    messages = messages[-MAX_MESSAGES:]

    cache.set(key, messages, MESSAGE_TTL)

    # ── Bookkeeping ──
    increment_unread(agent_id, application_id, is_from_admin)
    if is_from_admin:
        _bump_total(f"unread:agent:total:{agent_id}", 1)
    else:
        _bump_total("unread:admin:total", 1)

    return chat_message


def get_messages(agent_id, application_id=None):
    key = get_chat_key(agent_id, application_id)

    return cache.get(key, [])









# ─────────────────────────────────────────────────────────────
# UNREAD COUNTERS (replaces AgentAdminMessage.is_read counting)
# ─────────────────────────────────────────────────────────────

def _unread_key(agent_id, application_id, for_admin):
    """
    for_admin=True  -> counts messages FROM the agent, unread BY admin
    for_admin=False -> counts messages FROM admin, unread BY the agent
    """
    scope = f"app:{application_id}" if application_id else "general"
    who = "admin" if for_admin else "agent"
    return f"unread:{who}:agent:{agent_id}:{scope}"


def increment_unread(agent_id, application_id, is_from_admin):
    """
    Call this right after appending to chat history. If the message is
    FROM admin, it's unread FOR the agent. If FROM the agent, it's
    unread FOR admin.
    """
    for_admin = not is_from_admin  # message from agent -> unread for admin
    key = _unread_key(agent_id, application_id, for_admin)
    count = cache.get(key, 0)
    cache.set(key, count + 1, MESSAGE_TTL)


def get_unread_count(agent_id, application_id, for_admin):
    key = _unread_key(agent_id, application_id, for_admin)
    return cache.get(key, 0)


def reset_unread(agent_id, application_id, for_admin):
    key = _unread_key(agent_id, application_id, for_admin)
    current_count = cache.get(key, 0)
    if current_count > 0:
        cache.set(key, 0, MESSAGE_TTL)
        if for_admin:
            _bump_total("unread:admin:total", -current_count)
        else:
            _bump_total(f"unread:agent:total:{agent_id}", -current_count)

def get_total_unread_for_admin():
    return cache.get("unread:admin:total", 0)


def get_total_unread_for_agent(agent_id):
    return cache.get(f"unread:agent:total:{agent_id}", 0)


def _bump_total(key, delta):
    current = cache.get(key, 0)
    cache.set(key, max(0, current + delta), MESSAGE_TTL)