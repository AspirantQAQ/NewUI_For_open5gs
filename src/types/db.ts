export interface Ambr {
  downlink: { value: number; unit: number };
  uplink: { value: number; unit: number };
}

export interface QosArp {
  priority_level: number;
  pre_emption_capability: number;
  pre_emption_vulnerability: number;
}

export interface PccRuleFlow {
  direction: number;
  description: string;
}

export interface PccRule {
  flow?: PccRuleFlow[];
  qos: {
    index: number;
    arp: QosArp;
    mbr?: Ambr;
    gbr?: Ambr;
  };
}

export interface Session {
  name: string;
  type: number;
  qos: { index: number; arp: QosArp };
  ambr?: Ambr;
  ue?: { ipv4?: string; ipv6?: string };
  smf?: { ipv4?: string; ipv6?: string };
  pcc_rule?: PccRule[];
  lbo_roaming_allowed?: boolean;
}

export interface Slice {
  sst: number;
  sd?: string;
  default_indicator?: boolean;
  session: Session[];
}

export interface Subscriber {
  _id: string;
  schema_version: number;
  imsi: string;
  msisdn?: string[];
  imeisv?: string[];
  mme_host?: string[];
  mme_realm?: string[];
  purge_flag?: boolean[];
  security: {
    k: string;
    op?: string;
    opc?: string;
    amf: string;
    rand?: string;
    sqn?: number;
  };
  ambr?: Ambr;
  slice: Slice[];
  subscriber_status: number;
  operator_determined_barring: number;
  network_access_mode: number;
  subscribed_rau_tau_timer: number;
  access_restriction_data: number;
  __v?: number;
}

export interface Profile {
  _id: string;
  schema_version: number;
  title: string;
  msisdn?: string[];
  security: {
    k: string;
    op?: string;
    opc?: string;
    amf: string;
  };
  ambr?: Ambr;
  slice: Slice[];
  subscriber_status: number;
  operator_determined_barring: number;
  __v?: number;
}

export interface Account {
  _id: string;
  username: string;
  roles: string[];
  __v?: number;
}
