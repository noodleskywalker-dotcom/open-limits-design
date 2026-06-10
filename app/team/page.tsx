import { getTeamMembers } from "@/lib/cms/queries";

export default async function TeamPage() {
  const team = await getTeamMembers();

  return (
    <main className="page">
      <section className="section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Team</p>
            <h1>Staff profiles from the dashboard.</h1>
            <p>Upload photos and add, edit, remove, publish, or hide team members from the admin CMS.</p>
          </div>
        </div>

        {team.length ? (
          <div className="grid">
            {team.map((member) => (
              <article className="card" key={member.id}>
                {member.photo ? (
                  <img src={member.photo.public_url} alt={member.photo.alt_text ?? member.name} />
                ) : (
                  <div className="image-placeholder">Staff photo</div>
                )}
                <div className="card-body">
                  <p className="meta">{member.role}</p>
                  <h3>{member.name}</h3>
                  {member.bio ? <p>{member.bio}</p> : null}
                  {member.email ? <p>{member.email}</p> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">No published team members yet. Add staff in admin.</div>
        )}
      </section>
    </main>
  );
}
