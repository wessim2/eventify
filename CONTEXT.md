# Eventify

A multi-tenant Tech-Event Operating System SaaS that enables organizations to create, manage, and publish technology events through a control plane dashboard and a public storefront.

## Language

**Organization**:
A tenant in the system. The top-level entity that owns events and contains members. All data isolation is scoped to an Organization.
_Avoid_: Team, workspace, company, account

**Member**:
A human user who belongs to an Organization with a specific role. A single User can be a Member of multiple Organizations with different roles in each.
_Avoid_: Participant, attendee, staff

**User**:
An authenticated identity in the system, identified by email and credentials. A User exists independently of any Organization and can hold memberships in many.
_Avoid_: Account, profile

**Membership**:
The association between a User and an Organization, carrying exactly one Role. A User has one Membership per Organization they belong to.
_Avoid_: Assignment, enrollment

**Role**:
The permission tier a Member holds within a specific Organization. One of: Owner, Admin, or Member. Roles are scoped to a single Organization — the same User can be an Owner in one org and a Member in another.
_Avoid_: Permission level, access tier

**Owner**:
The highest Role within an Organization. Can delete the org, transfer ownership, manage billing, and perform all Admin and Member actions. Every Organization must have at least one Owner.
_Avoid_: Super admin, creator

**Event**:
A tech event (conference, meetup, workshop, hackathon) owned by an Organization. Has a lifecycle status: Draft, Published, Completed, or Cancelled.
_Avoid_: Session, gathering, occurrence

**Draft**:
The initial status of a newly created Event. Not visible on the public storefront. Editable by Admins and Owners.
_Avoid_: Unpublished, pending

**Published**:
An Event status indicating the event is live and visible on the public storefront. Transitioned to from Draft.
_Avoid_: Live, active, public

**Completed**:
A terminal Event status indicating the event has concluded. Transitioned to automatically when a Published event passes its end date, or manually by an Admin/Owner.
_Avoid_: Finished, ended, archived

**Cancelled**:
A terminal Event status. Reachable from Draft or Published. Indicates the event will not take place.
_Avoid_: Deleted, removed

**Control Plane**:
The organizer-facing Next.js dashboard where Members manage their Organization's events, team, and settings. Client-side rendered.
_Avoid_: Admin panel, back office, CMS

**Storefront**:
The public-facing Next.js application where end-users browse and discover Published events. Server-side rendered for SEO.
_Avoid_: Landing page, public site, marketing site

**Tenant Context**:
The active Organization a User is operating within during an API request. Propagated via the `X-Organization-Id` header and used to set the PostgreSQL session variable for Row-Level Security filtering.
_Avoid_: Active org, current workspace
