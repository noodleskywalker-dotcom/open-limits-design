import { getTeamMembers } from "@/lib/cms/queries";
import { resolveImageUrl } from "@/lib/cms/types";

export const metadata = { title: "Team — Open Limits Design" };

export default async function TeamPage() {
  const team = await getTeamMembers();

  return (
    <main className="page">
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Team</p>
            <h1>The studio behind the work.</h1>
            <p>Add, edit, or remove team members and photos from Admin → Team.</p>
          </div>
        </div>

        {team.length ? (
          <div className="grid">
            {team.map((member) => {
              const photo = resolveImageUrl(member.photo, member.photo_url);
              return (
                <article className="card" key={member.id}>
                  {photo ? (
                    <img src={photo} alt={member.name} />
                  ) : (
                    <div className="image-placeholder">{member.name}</div>
                  )}
                  <div className="card-body">
                    <p className="meta">{member.role}</p>
                    <h3>{member.name}</h3>
                    {member.bio ? <p>{member.bio}</p> : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">No active team members yet. Add staff in admin.</div>
        )}
      </section>
    </main>
  );
}
