import { useEffect, useRef } from "react";

const useAdminWebSocket = (agentId, appId, onMessage) => {
    const wsRef = useRef(null);

    useEffect(() => {
        if (!agentId || !appId) {
            console.log("Admin WebSocket not started", {
                agentId,
                appId,
            });
            return;
        }

        let url;

        if (appId === "general") {
            url = `ws://127.0.0.1:8000/ws/agent/${agentId}/general/`;
        } else {
            url = `ws://127.0.0.1:8000/ws/agent/${agentId}/app/${appId}/`;
        }

        console.log("ADMIN WebSocket connecting:", url);

        const ws = new WebSocket(url);

        wsRef.current = ws;

        ws.onopen = () => {
            console.log("ADMIN WEBSOCKET CONNECTED:", url);
        };

        ws.onmessage = (event) => {
            console.log("ADMIN WEBSOCKET MESSAGE:", event.data);

            try {
                const data = JSON.parse(event.data);

                if (onMessage) {
                    onMessage(data);
                }
            } catch (error) {
                console.error(
                    "Admin WebSocket JSON error:",
                    error
                );
            }
        };

        ws.onerror = (error) => {
            console.error(
                "ADMIN WEBSOCKET ERROR:",
                error
            );
        };

        ws.onclose = (event) => {
            console.log(
                "ADMIN WEBSOCKET CLOSED:",
                event.code,
                event.reason
            );

            if (wsRef.current === ws) {
                wsRef.current = null;
            }
        };

        return () => {
            console.log("Closing ADMIN WebSocket");

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
    }, [agentId, appId, onMessage]);

    const sendMessage = (
        message,
        applicationId = null
    ) => {
        const ws = wsRef.current;

        if (!ws) {
            console.error(
                "ADMIN WebSocket not initialized"
            );
            return false;
        }

        if (ws.readyState !== WebSocket.OPEN) {
            console.error(
                "ADMIN WebSocket is not connected. ReadyState:",
                ws.readyState
            );
            return false;
        }

        const data = {
            message,
            application_id: applicationId,
            is_from_admin: true,
        };

        console.log(
            "ADMIN sending WebSocket message:",
            data
        );

        ws.send(JSON.stringify(data));

        return true;
    };

    return {
        wsRef,
        sendMessage,
    };
};

export default useAdminWebSocket;