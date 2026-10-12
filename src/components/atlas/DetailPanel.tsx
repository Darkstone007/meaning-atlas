import { displayName, kindLabel, layerTags, wordKey } from "@/lib/atlas/core";
import type { Account, Edge } from "@/lib/atlas/types";

function Block({ id, title, text }: { id: string; title: string; text: string }) {
  return (
    <section id={`section-${id}`}>
      <h3>{title}</h3>
      <p>{text.trim() ? text : "Not supplied."}</p>
    </section>
  );
}

function MediaBlock({ account }: { account: Account }) {
  return (
    <section id="section-media">
      <h3>Audio and visual context</h3>
      {!account.media.length ? <p className="quiet">No media attached.</p> : null}
      {account.media.map((item) => (
        <div key={item.id}>
          {item.mime.startsWith("image/") ? (
            <img src={item.data} alt={item.caption || "Participant supplied image"} />
          ) : (
            <div>
              {item.mime.startsWith("audio/") ? (
                <audio controls preload="metadata" src={item.data} />
              ) : (
                <video controls preload="metadata" src={item.data} />
              )}
            </div>
          )}
          <p className="quiet">{item.caption || "No caption supplied."}</p>
          {item.tags.length ? <p className="quiet">Media labels: {item.tags.join(", ")}</p> : null}
        </div>
      ))}
      {account.consent.publicRecording || account.consent.classRecording ? (
        <p className="quiet">
          {account.media.some((item) => !item.mime.startsWith("image/"))
            ? "Playback follows the permission stored with this account."
            : "A recording was permitted, but no audio or video file is attached."}
        </p>
      ) : (
        <p className="quiet">This account is not cleared for playing a recording.</p>
      )}
    </section>
  );
}

export function DetailPanel({
  records,
  visible,
  selectedId,
  edges,
  onSelect,
  onAnother,
  onEdit,
  onRemove,
}: {
  records: Account[];
  visible: Account[];
  selectedId: string | null;
  edges: Edge[];
  onSelect: (id: string) => void;
  onAnother: (account: Account) => void;
  onEdit: (account: Account) => void;
  onRemove: (account: Account) => void;
}) {
  const account = records.find((item) => item.id === selectedId);
  if (!account) {
    return (
      <aside className="detail" aria-label="Selected response">
        <span className="eyebrow">The story behind the word</span>
        <h2>Meaning belongs to its speaker.</h2>
        <p className="intro">Select an account to read its explanation, context and any permitted media. Different meanings stay side by side.</p>
      </aside>
    );
  }

  const outside = !visible.some((item) => item.id === account.id);
  const siblings = records.filter((item) => wordKey(item) === wordKey(account));
  const related = edges.filter((edge) => edge.source === account.id || edge.target === account.id);
  const labels = ["emotion", "context", "intention"] as const;

  return (
    <aside className="detail" aria-label="Selected response">
      <span className="eyebrow">
        {account.typeReviewed ? kindLabel(account.kind) : "Survey account · type not reviewed"}
      </span>
      <h2>{account.expression}</h2>
      <span className="badge">{displayName(account, records.indexOf(account))}</span>
      <span className="badge">{account.languages}</span>
      {account.community ? <span className="badge">{account.community}</span> : null}
      {account.consent.publicWritten ? <span className="badge">Public writing permitted</span> : null}
      {account.consent.classWritten && !account.consent.publicWritten ? (
        <span className="badge">Class presentation only</span>
      ) : null}
      {siblings.length > 1 ? (
        <div className="row">
          {siblings.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`small-button${item.id === account.id ? " active" : ""}`}
              onClick={() => onSelect(item.id)}
            >
              {displayName(item, records.indexOf(item))}
            </button>
          ))}
        </div>
      ) : null}
      {outside ? <p className="quiet">The selected account is outside this search. Choose a result to compare its connections.</p> : null}
      <p className="quiet">
        Source: {account.source}. Labels: {account.codingSource === "researcher" ? "researcher, provisional" : account.codingSource}.
      </p>
      <Block id="meaning" title="Meaning and feeling" text={account.meaning} />
      <Block
        id="feeling"
        title="Feeling"
        text={account.feeling || "Not written as a separate answer. The feeling is in the meaning above."}
      />
      <Block id="context" title="Example and context" text={account.example || account.context} />
      <Block id="origin" title="Where it comes from" text={account.origin} />
      <Block id="languages" title="Languages and who they are used with" text={account.languagePractice} />
      <Block id="adaptation" title="Rephrasing" text={account.rephrasing} />
      <Block
        id="change"
        title="What changes"
        text={account.change || "Not written as a separate answer. What changes, if they said so, is in the rephrasing above."}
      />
      <Block id="withheld" title="Does company change the expression?" text={account.withheld} />
      <Block id="identity" title="Does changing how you speak change how you feel?" text={account.identity} />
      <Block id="listener" title="When an expression is unfamiliar" text={account.listenerPractice} />
      {account.intention ? <Block id="intention" title="What they are trying to do" text={account.intention} /> : null}
      <section>
        <h3>Labels on this account</h3>
        <p className="quiet">
          {account.codingSource === "researcher"
            ? "These labels were assigned by the researcher from the contributor’s own wording. They are provisional. A shared label is not a claim of equivalent meaning."
            : account.codingSource === "participant"
              ? "These labels were chosen with the account. A shared label is not a claim of equivalent meaning."
              : "No labels yet. Connections appear only after an exact label is shared."}
        </p>
        {labels.map((layer) => (
          <p key={layer}>
            {layer[0].toUpperCase() + layer.slice(1)}: {layerTags(account, layer).join(", ") || "none"}
          </p>
        ))}
      </section>
      <MediaBlock account={account} />
      <section>
        <h3>Why these accounts connect</h3>
        {!related.length ? (
          <p className="quiet">No shared labels in the selected layer. This account still belongs in the archive.</p>
        ) : (
          related.map((edge) => {
            const otherId = edge.source === account.id ? edge.target : edge.source;
            const other = records.find((item) => item.id === otherId);
            if (!other) return null;
            return (
              <button key={`${edge.source}-${edge.target}-${edge.layer}`} type="button" className="connection" onClick={() => onSelect(other.id)}>
                {other.expression} · {displayName(other, records.indexOf(other))} — {edge.layer}: {edge.shared.join(", ")}
              </button>
            );
          })
        )}
        <p className="quiet">A connection is an exact shared label, or an association someone wrote. It does not prove equivalent meaning.</p>
      </section>
      <div className="row">
        <button type="button" onClick={() => onAnother(account)}>
          Add another meaning
        </button>
        <button type="button" onClick={() => onEdit(account)}>
          Edit local account
        </button>
        <button type="button" className="danger" onClick={() => onRemove(account)}>
          Remove locally
        </button>
      </div>
    </aside>
  );
}
