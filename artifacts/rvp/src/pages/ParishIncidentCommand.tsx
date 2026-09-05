import DecisionCenter from "@/components/dashboard/DecisionCenter";

export default function ParishIncidentCommand() {
  return (
    <DecisionCenter
      scope="parish"
      title="Incident Command — St. Elizabeth"
      reviewerId="PARISH-MGR-ST-ELIZABETH"
      contextParishId="st-elizabeth"
      filterParishId="st-elizabeth"
    />
  );
}
