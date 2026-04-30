import { Incident } from "../types.js";

interface AlertStrategy {
  notify(incident: Incident): Promise<void>;
}

class PagerCriticalStrategy implements AlertStrategy {
  async notify(incident: Incident) {
    console.log(`[ALERT:PAGER] P0 incident ${incident.id} component=${incident.component_id}`);
  }
}

class SlackEmailStrategy implements AlertStrategy {
  async notify(incident: Incident) {
    console.log(`[ALERT:SLACK_EMAIL] P1 incident ${incident.id} component=${incident.component_id}`);
  }
}

class LogOnlyStrategy implements AlertStrategy {
  async notify(incident: Incident) {
    console.log(`[ALERT:LOG] P2 incident ${incident.id} component=${incident.component_id}`);
  }
}

const strategies = {
  P0: new PagerCriticalStrategy(),
  P1: new SlackEmailStrategy(),
  P2: new LogOnlyStrategy()
};

export async function alertIncident(incident: Incident) {
  await strategies[incident.severity].notify(incident);
}
