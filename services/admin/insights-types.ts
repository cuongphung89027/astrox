export type InsightMetric = {current:number|null;previous:number|null};
export type InsightFeature = {module:string;service:string;views:number;starts:number;results:number;cache:number;aiResults:number;calculationResults:number;savedResults:number;saved:number;errors:number|null;sessions:number;completionRate:number|null};
export interface AdminInsights {
 from:string;to:string;updatedAt:string;timezone:'Asia/Ho_Chi_Minh';module:string;
 availability:Record<string,boolean>;notes:string[];coverageStart:string|null;coverage:{partial:boolean};
 overview:{activeSessions:InsightMetric;results:InsightMetric;paidVnd:InsightMetric;pointsSpent:InsightMetric;errors:InsightMetric};
 daily:{day:string;sessions:number|null;results:number|null;paidVnd:number|null;pointsSpent:number|null}[];
 features:InsightFeature[];modules:InsightFeature[];devices:{device:string;events:number}[];
 rewards:{repeatAttendance:number|null;milestones:number|null;attendanceDaily:{day:string;count:number}[];attendance:number|null;events:number|null;completed:number|null;participants:number|null;pointsGranted:number|null;referrals:number|null;referredUsed:number|null;referredPaid:number|null;adStarted:number|null;adGranted:number|null;adPoints:number|null};
 finance:{paidVnd:number|null;paidOrders:number|null;pendingOrders:number|null;cancelledOrders:number|null;topupPoints:number|null;rewardPoints:number|null;spentPoints:number|null};
}
export interface SupportUser {id:string;display_name:string|null;email:string|null;status:string;created_at:string;updated_at:string}
export interface SupportTimeline {id:string;kind:string;at:string;status:string|null;points:number|null;amountVnd:number|null;service:string|null}
export interface AdminSupport {available:boolean;page:number;pageSize:number;total:number;rows:SupportUser[];user:SupportUser|null;timeline:SupportTimeline[];timelineTruncated:boolean;timelinePage:number;nextTimelinePage:number|null;availability:Record<string,boolean>}
export type IssueStatus='new'|'acknowledged'|'in_progress'|'resolved';
export interface AdminIssue {id:string;kind:string;label:string;count:number;lastAt:string;status:IssueStatus;priority:'high'|'medium';updatedAt:string|null}
export interface AdminIssues {available:boolean;canManage:boolean;rows:AdminIssue[];availability:Record<string,boolean>}
