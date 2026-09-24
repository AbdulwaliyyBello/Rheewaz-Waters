"use client";
import React, { useEffect, useState } from "react";
import { C, Card, Field, Btn, Pill, inputStyle } from "@/lib/ui";
import { api, ApiError } from "@/lib/api-client";

type Trip = {
  id: string; workerName: string; truckName: string; status: string;
  physicalArrivalBags: number | null; physicalDepartureBags: number | null;
  newBagsLoaded: number | null; bonusBags: number | null; companyBags: number | null;
  aiDepartureBags: number | null; aiConfidence: number | null; bossFinalBags: number | null;
};
type Worker = { id: string; name: string; truck: { id: string; name: string } | null };
type Truck = { id: string; name: string; type: string };

const ERROR_TYPES = [
  "missed_bag", "false_bag", "wrong_row_count", "wrong_incomplete_row_count", "wrong_top_bag_count",
  "wrong_arrival_count", "wrong_departure_count", "wrong_truck", "wrong_object_classification",
  "excluded_drinking_water", "excluded_nylon", "other",
];

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newWorkerId, setNewWorkerId] = useState("");
  const [newTruckId, setNewTruckId] = useState("");
  const [newArrival, setNewArrival] = useState(0);
  const [err, setErr] = useState("");

  const refresh = () => {
    api<{ trips: Trip[] }>("/api/trips").then((r) => setTrips(r.trips));
    api<{ workers: Worker[] }>("/api/workers").then((r) => setWorkers(r.workers));
    api<{ trucks: Truck[] }>("/api/trucks").then((r) => setTrucks(r.trucks));
  };
  useEffect(() => { refresh(); }, []);

  const createTrip = async (e: React.FormEvent) => {
    e.preventDefault(); setErr("");
    if (!newWorkerId || !newTruckId) return setErr("Select a worker and truck.");
    try {
      await api("/api/trips", { method: "POST", body: JSON.stringify({ workerId: newWorkerId, truckId: newTruckId, physicalArrivalBags: newArrival }) });
      setShowNew(false); setNewWorkerId(""); setNewTruckId(""); setNewArrival(0);
      refresh();
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Something went wrong."); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Trips</div>
        <Btn onClick={() => setShowNew((s) => !s)}>New Trip</Btn>
      </div>

      {showNew && (
        <Card style={{ padding: 18, marginBottom: 16 }}>
          <form onSubmit={createTrip}>
            <Field label="Worker">
              <select style={inputStyle} value={newWorkerId} onChange={(e) => {
                setNewWorkerId(e.target.value);
                const w = workers.find((x) => x.id === e.target.value);
                if (w?.truck) setNewTruckId(w.truck.id);
              }}>
                <option value="">Select worker</option>
                {workers.map((w) => <option key={w.id} value={w.id}>{w.name}{w.truck ? ` — ${w.truck.name}` : ""}</option>)}
              </select>
            </Field>
            <Field label="Truck">
              <select style={inputStyle} value={newTruckId} onChange={(e) => setNewTruckId(e.target.value)}>
                <option value="">Select truck</option>
                {trucks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Physical arrival bags (observed)"><input type="number" min={0} style={inputStyle} value={newArrival} onChange={(e) => setNewArrival(Number(e.target.value))} /></Field>
            {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
            <Btn type="submit">Create trip</Btn>
          </form>
        </Card>
      )}

      {trips.length === 0 && <div style={{ padding: 24, textAlign: "center", color: C.inkSoft }}>No trips yet.</div>}
      {trips.map((t) => <TripCard key={t.id} trip={t} onChanged={refresh} />)}
    </div>
  );
}

function TripCard({ trip, onChanged }: { trip: Trip; onChanged: () => void }) {
  const [departure, setDeparture] = useState<number>(trip.physicalDepartureBags ?? 0);
  const [bossFinal, setBossFinal] = useState<number>(trip.bossFinalBags ?? trip.companyBags ?? 0);
  const [errorType, setErrorType] = useState(ERROR_TYPES[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const statusTone = trip.status === "boss_reviewed" ? "good" : trip.status === "ai_review" ? "gold" : "neutral";

  const recordDeparture = async () => {
    setBusy(true);
    await api(`/api/trips/${trip.id}`, { method: "PATCH", body: JSON.stringify({ physicalDepartureBags: departure }) });
    setBusy(false); onChanged();
  };
  const review = async () => {
    setBusy(true);
    await api("/api/ai/corrections", { method: "POST", body: JSON.stringify({ tripId: trip.id, bossActualBags: bossFinal, errorType: trip.aiDepartureBags != null ? errorType : undefined, bossNote: note || undefined }) });
    setBusy(false); onChanged();
  };

  return (
    <Card style={{ padding: 16, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div><div style={{ fontWeight: 700, fontSize: 14.5 }}>{trip.workerName} — {trip.truckName}</div></div>
        <Pill tone={statusTone as any}>{trip.status.replace(/_/g, " ")}</Pill>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 12.5, color: C.inkSoft, marginBottom: 10 }}>
        <div>Arrival: <strong style={{ color: C.ink }}>{trip.physicalArrivalBags ?? "—"}</strong></div>
        <div>Departure: <strong style={{ color: C.ink }}>{trip.physicalDepartureBags ?? "—"}</strong></div>
        <div>New/Bonus/Company: <strong style={{ color: C.ink }}>{trip.newBagsLoaded ?? "—"}/{trip.bonusBags ?? "—"}/{trip.companyBags ?? "—"}</strong></div>
        <div>AI departure: <strong style={{ color: C.ink }}>{trip.aiDepartureBags ?? "not run"}</strong></div>
        <div>AI confidence: <strong style={{ color: C.ink }}>{trip.aiConfidence != null ? `${Math.round(trip.aiConfidence * 100)}%` : "—"}</strong></div>
        <div>Boss final: <strong style={{ color: C.ink }}>{trip.bossFinalBags ?? "—"}</strong></div>
      </div>

      {trip.physicalDepartureBags == null && (
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
          <Field label="Physical departure bags (observed)"><input type="number" min={0} style={inputStyle} value={departure} onChange={(e) => setDeparture(Number(e.target.value))} /></Field>
          <Btn onClick={recordDeparture} disabled={busy}>Record</Btn>
        </div>
      )}

      {trip.physicalDepartureBags != null && trip.status !== "boss_reviewed" && (
        <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 12, marginTop: 4 }}>
          <Field label="Boss final company bags"><input type="number" min={0} style={inputStyle} value={bossFinal} onChange={(e) => setBossFinal(Number(e.target.value))} /></Field>
          {trip.aiDepartureBags != null && (
            <Field label="Error type (correcting a real AI prediction)">
              <select style={inputStyle} value={errorType} onChange={(e) => setErrorType(e.target.value)}>
                {ERROR_TYPES.map((et) => <option key={et} value={et}>{et.replace(/_/g, " ")}</option>)}
              </select>
            </Field>
          )}
          <Field label="Note (optional)"><input style={inputStyle} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
          <Btn onClick={review} disabled={busy}>Confirm Final Count</Btn>
        </div>
      )}
    </Card>
  );
}
