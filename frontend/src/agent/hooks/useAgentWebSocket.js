import { useEffect, useRef } from "react";

const useAgentWebSocket = (agentId, appId, onMessage) => {
    const wsRef = useRef(null);
    const onMessageRef = useRef(onMessage);

    // Always keep the latest callback
    useEffect(() => {
        onMessageRef.current = onMessage;
    }, [onMessage]);

    useEffect(() => {
        console.log("=================================");
        console.log("WebSocket agentId:", agentId);
        console.log("WebSocket appId:", appId);

        if (!agentId) {
            console.log("NO AGENT ID - WebSocket NOT started");
            return;
        }

        /*
         * Build WebSocket URL
         *
         * Application:
         * ws://127.0.0.1:8000/ws/agent/1/app/1/
         *
         * General:
         * ws://127.0.0.1:8000/ws/agent/1/general/
         */

        const token = localStorage.getItem("agent_token");

        if (!token) {
            console.log("NO AGENT TOKEN - WebSocket NOT started");
            return;
        }

        let url;

        if (appId === "general" || appId === null || appId === undefined) {
            url = `ws://127.0.0.1:8000/ws/agent/${agentId}/general/?token=${encodeURIComponent(token)}`;
        } else {
            url = `ws://127.0.0.1:8000/ws/agent/${agentId}/app/${appId}/?token=${encodeURIComponent(token)}`;
        }

        console.log("Connecting WebSocket:", url);

        const ws = new WebSocket(url);

        wsRef.current = ws;

        // -------------------------
        // CONNECTED
        // -------------------------
        ws.onopen = () => {
            console.log("=================================");
            console.log("WEBSOCKET CONNECTED");
            console.log("URL:", url);
            console.log("=================================");
        };

        // -------------------------
        // MESSAGE RECEIVED
        // -------------------------
        ws.onmessage = (event) => {
            console.log("WEBSOCKET RAW MESSAGE:", event.data);

            try {
                const data = JSON.parse(event.data);

                console.log("WEBSOCKET PARSED MESSAGE:", data);

                if (onMessageRef.current) {
                    onMessageRef.current(data);
                }
            } catch (error) {
                console.error("WebSocket JSON error:", error);
            }
        };

        // -------------------------
        // ERROR
        // -------------------------
        ws.onerror = (error) => {
            console.error("=================================");
            console.error("WEBSOCKET ERROR");
            console.error("URL:", url);
            console.error(error);
            console.error("=================================");
        };

        // -------------------------
        // CLOSED
        // -------------------------
        ws.onclose = (event) => {
            console.log("=================================");
            console.log("WEBSOCKET CLOSED");
            console.log("Code:", event.code);
            console.log("Reason:", event.reason);
            console.log("URL:", url);
            console.log("=================================");

            if (wsRef.current === ws) {
                wsRef.current = null;
            }
        };

        // -------------------------
        // CLEANUP
        // -------------------------
        return () => {
            console.log("Closing WebSocket:", url);

            if (
                ws.readyState === WebSocket.OPEN ||
                ws.readyState === WebSocket.CONNECTING
            ) {
                ws.close();
            }

            if (wsRef.current === ws) {
                wsRef.current = null;
            }
        };

    }, [agentId, appId]);

    // =====================================================
    // SEND MESSAGE
    // =====================================================

    const sendMessage = (
        message,
        applicationId = null,
        isFromAdmin = false
    ) => {

        const ws = wsRef.current;

        if (!ws) {
            console.error("WebSocket not initialized");
            return false;
        }

        if (ws.readyState !== WebSocket.OPEN) {
            console.error(
                "WebSocket is not connected.",
                "ReadyState:",
                ws.readyState
            );

            return false;
        }

        const data = {
            message: message,
            application_id: applicationId,
            is_from_admin: isFromAdmin,
        };

        console.log("=================================");
        console.log("SENDING WEBSOCKET MESSAGE");
        console.log(data);
        console.log("=================================");

        ws.send(JSON.stringify(data));

        return true;
    };

    return {
        wsRef,
        sendMessage,
    };
};

export default useAgentWebSocket;