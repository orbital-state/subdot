export interface IJob {
    id: string;
    createdAt: number;
  }
  
  export interface SubjectConfig {
    subject: string;
    useJetStream?: boolean; // Defaults to false
  }
  
  export interface FilterRuleConfig {
    query: string; // JSONata expression
    // Future extensibility: precompiled, parameters, etc.
  }
  
  export interface FilterJob extends IJob {
    source: SubjectConfig;
    target: SubjectConfig;
  
    filter: FilterRuleConfig;
  
    inputFormat?: string;   // defaults to "json"
    outputFormat?: string;  // defaults to "json"
  
    heartbeatTtlMs: number;

    status: 'PENDING' | 'RUNNING' | 'ORPHAN';
  }
