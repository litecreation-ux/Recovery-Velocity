import DecisionCenter from "@/components/dashboard/DecisionCenter";

export default function ReviewGate() {
  return (
    <DecisionCenter
      scope="national"
      title="Incident Command"
      reviewerId="COORDINATOR-01"
      contextParishId="st-thomas"
    />
  );
}
