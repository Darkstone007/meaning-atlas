export function MethodView() {
  return (
    <article className="form-panel">
      <span className="eyebrow">How the archive is made</span>
      <h2>Participant wording first. Connections second.</h2>
      <p className="intro">
        An interpretive archive, not an automatic translator. No language model, embedding, image recognition or emotional inference is used.
      </p>
      <h3>Capture, preserve, label, connect, review</h3>
      <p>
        Each account keeps the contributor’s explanation. A word groups accounts only when the expression, language labels and community label match after whitespace and case normalisation. Diacritics stay. Two accounts of Massa remain two accounts when their community labels differ.
      </p>
      <h3>How a link is allowed to appear</h3>
      <table>
        <thead>
          <tr>
            <th>Layer</th>
            <th>Rule</th>
            <th>What it means</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Emotion</td>
            <td>The same emotion label on both accounts</td>
            <td>A similar reported feeling, not the same meaning</td>
          </tr>
          <tr>
            <td>Context</td>
            <td>The same setting or relationship label</td>
            <td>Similar circumstances of use</td>
          </tr>
          <tr>
            <td>Intention</td>
            <td>The same purpose label</td>
            <td>A similar aim, such as comfort or approval</td>
          </tr>
          <tr>
            <td>Media</td>
            <td>The same label typed beside the files</td>
            <td>A shared annotation, not a similar picture or voice</td>
          </tr>
          <tr>
            <td>Personal</td>
            <td>Someone named another account and wrote why</td>
            <td>An authored association</td>
          </tr>
        </tbody>
      </table>
      <p>The line should be read as “shared context: friends”, not as “these mean the same thing”. Accounts with no match stay visible.</p>
      <h3>What the web is doing</h3>
      <p>
        Words sit on a circle. Responses branch outward. Selecting a response opens meaning, feeling, context, adaptation, change and media. Rotation is a camera, not a score. Distance is not cultural closeness. The shelves are the same records, gathered by language label.
      </p>
      <h3>The survey and what is withheld</h3>
      <p>
        The contribution form uses the survey questions. Three written responses from 12 October 2026 are included because those contributors allowed public display of the writing, under the names they chose. Contact details are not stored. One response asked not to be displayed; it is not in this archive at all. Labels on the included accounts are a researcher’s provisional reading of their wording, kept separate from the wording.
      </p>
      <h3>What this installation does not do</h3>
      <p>
        It does not synchronise browsers, connect to the live form, download media links from a spreadsheet, or treat five accounts as a finding about a language. A later suggestion model, if any, would propose labels for a person to accept. It would not replace what someone wrote.
      </p>
    </article>
  );
}
