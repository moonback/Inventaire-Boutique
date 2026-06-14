import { useEffect, useRef } from "react";
import { toInventoryItem, SupabaseInventoryRow } from "../lib/supabaseInventory";
import { InventoryItem } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const inventoryTable = import.meta.env.VITE_SUPABASE_INVENTORY_TABLE || "inventory_items";

interface RealtimeChangePayload {
  event_type: "INSERT" | "UPDATE" | "DELETE";
  record: SupabaseInventoryRow;
  old_record: { barcode: string };
}

interface useSupabaseRealtimeProps {
  enabled: boolean;
  onInsert: (item: InventoryItem) => void;
  onUpdate: (item: InventoryItem) => void;
  onDelete: (barcode: string) => void;
}

export function useSupabaseRealtime({
  enabled,
  onInsert,
  onUpdate,
  onDelete,
}: useSupabaseRealtimeProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<number | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const refCount = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !supabaseUrl || !supabaseAnonKey) {
      return;
    }

    const wsUrl = `${supabaseUrl.replace(/^http/, "ws")}/realtime/v1/websocket?apikey=${supabaseAnonKey}&vsn=1.0.0`;
    const topic = `realtime:public:${inventoryTable}`;

    function connect() {
      if (wsRef.current) return;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("Realtime: WebSocket connecté");
        
        // Start Heartbeat
        heartbeatIntervalRef.current = window.setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            refCount.current++;
            ws.send(
              JSON.stringify({
                topic: "phoenix",
                event: "heartbeat",
                payload: {},
                ref: `hb_${refCount.current}`,
              })
            );
          }
        }, 30000);

        // Join Channel
        refCount.current++;
        ws.send(
          JSON.stringify({
            topic,
            event: "phx_join",
            payload: {
              config: {
                postgres_changes: [
                  {
                    event: "*",
                    schema: "public",
                    table: inventoryTable,
                  },
                ],
              },
            },
            ref: `join_${refCount.current}`,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.topic === topic && data.event === "postgres_changes") {
            const payload = data.payload as { data: RealtimeChangePayload };
            if (payload && payload.data) {
              const { event_type, record, old_record } = payload.data;
              
              if (event_type === "INSERT") {
                onInsert(toInventoryItem(record));
              } else if (event_type === "UPDATE") {
                onUpdate(toInventoryItem(record));
              } else if (event_type === "DELETE") {
                onDelete(old_record.barcode);
              }
            }
          }
        } catch (err) {
          console.error("Realtime: Erreur de parsing du message", err);
        }
      };

      ws.onclose = () => {
        console.log("Realtime: WebSocket déconnecté. Tentative de reconconnexion...");
        cleanup();
        reconnectTimeoutRef.current = window.setTimeout(connect, 5000);
      };

      ws.onerror = (err) => {
        console.error("Realtime: Erreur WebSocket", err);
      };
    }

    function cleanup() {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }
        wsRef.current = null;
      }
    }

    connect();

    return () => {
      cleanup();
    };
  }, [enabled, onInsert, onUpdate, onDelete]);
}
