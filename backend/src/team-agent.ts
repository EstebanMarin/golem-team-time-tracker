import { BaseAgent, agent, endpoint, Result } from '@golemcloud/golem-ts-sdk';
import type { Member, TeamSummaryRow, ProjectTime } from './types.js';
import { MemberAgent } from './member-agent.js';

@agent({ mount: '/team' })
class TeamAgent extends BaseAgent {
  private members: Member[] = [];

  constructor() {
    super();
  }

  @endpoint({ post: '/members' })
  registerMember(id: string, name: string): Result<Member, { error: string }> {
    if (this.members.some(m => m.id === id)) {
      return Result.err({ error: `Member '${id}' already registered` });
    }
    const member: Member = { id, name, registeredAt: new Date().toISOString() };
    this.members.push(member);
    return Result.ok(member);
  }

  @endpoint({ get: '/members' })
  getMembers(): Member[] {
    return this.members;
  }

  @endpoint({ get: '/summary?from={from}&to={to}' })
  async getTeamSummary(
    from: string | undefined,
    to: string | undefined,
  ): Promise<TeamSummaryRow[]> {
    const rows: TeamSummaryRow[] = [];
    for (const member of this.members) {
      const entries = await MemberAgent.get(member.id).getEntries(from, to);
      const projectMap: Map<string, number> = new Map();
      let totalMinutes = 0;
      for (const e of entries) {
        const mins = e.durationMinutes ?? 0;
        totalMinutes += mins;
        projectMap.set(e.project, (projectMap.get(e.project) ?? 0) + mins);
      }
      const projects: ProjectTime[] = Array.from(projectMap.entries()).map(
        ([project, minutes]) => ({ project, minutes }),
      );
      rows.push({
        memberId: member.id,
        memberName: member.name,
        totalMinutes,
        entries: entries.length,
        projects,
      });
    }
    return rows;
  }
}
