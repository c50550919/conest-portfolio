import { db } from '../config/database';

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: 'case_manager' | 'program_director' | 'org_admin' | 'super_admin';
  invited_at: Date | null;
  accepted_at: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const OrgMemberModel = {
  async findByOrgAndUser(
    orgId: string,
    userId: string,
  ): Promise<OrgMember | undefined> {
    return db('org_members')
      .where({ org_id: orgId, user_id: userId, is_active: true })
      .first();
  },

  async findByOrg(orgId: string): Promise<OrgMember[]> {
    return db('org_members')
      .join('users', 'org_members.user_id', 'users.id')
      .where({ 'org_members.org_id': orgId, 'org_members.is_active': true })
      .select(
        'org_members.*',
        'users.email',
      );
  },

  async create(data: Partial<OrgMember>): Promise<OrgMember> {
    const [member] = await db('org_members').insert(data).returning('*');
    return member;
  },

  async updateRole(
    id: string,
    role: OrgMember['role'],
  ): Promise<OrgMember> {
    const [member] = await db('org_members')
      .where({ id })
      .update({ role, updated_at: db.fn.now() })
      .returning('*');
    return member;
  },

  async getUserOrgs(
    userId: string,
  ): Promise<Array<OrgMember & { org_name: string; org_slug: string }>> {
    return db('org_members')
      .join('organizations', 'org_members.org_id', 'organizations.id')
      .where({
        'org_members.user_id': userId,
        'org_members.is_active': true,
      })
      .select(
        'org_members.*',
        'organizations.name as org_name',
        'organizations.slug as org_slug',
      );
  },
};

export default OrgMemberModel;
