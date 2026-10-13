import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Datenschutz – KartTrack" };

const H2 = "mb-2 mt-8 text-lg font-bold";

export default function Datenschutz() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 text-sm leading-relaxed text-neutral-300">
      <Link href="/" className="text-neutral-400 underline">← Zurück</Link>
      <h1 className="mb-2 mt-3 text-2xl font-black text-neutral-100">Datenschutzerklärung</h1>

      <p className="rounded-lg border border-amber-700 bg-amber-950/40 p-3 text-amber-200">
        Entwurf: Die mit [ ] markierten Angaben muss der Betreiber vor dem Livegang ausfüllen. Der Text ist ein
        Muster und ersetzt keine Rechtsberatung.
      </p>

      <h2 className={H2}>1. Verantwortlicher</h2>
      <p>[Name, Anschrift und E-Mail-Adresse des Betreibers]</p>

      <h2 className={H2}>2. Welche Daten wir verarbeiten</h2>
      <ul className="list-disc pl-5">
        <li><strong>Konto:</strong> E-Mail-Adresse, Benutzername und ein Passwort-Hash (das Passwort selbst speichern wir nicht).</li>
        <li><strong>Karting-Daten:</strong> Strecken, Sessions mit Datum, Kart, Wetter und Notizen sowie deine Rundenzeiten.</li>
        <li><strong>Soziale Daten:</strong> Freundschaftsanfragen und -listen.</li>
        <li><strong>Spiel-Daten:</strong> Achievements, XP und eingelöste Belohnungen.</li>
        <li><strong>Push-Abo (optional):</strong> Adresse und Schlüssel deines Browsers beim Push-Dienst, nur wenn du Benachrichtigungen aktivierst.</li>
        <li><strong>Technische Daten:</strong> IP-Adresse und Zeitpunkt der Anfrage in den Server-Protokollen der Hosting-Anbieter.</li>
      </ul>

      <h2 className={H2}>3. Wer was sieht</h2>
      <p>
        Dein Benutzername ist für alle angemeldeten Nutzer sichtbar (damit man dich als Freund finden kann). Deine
        Sessions und Rundenzeiten sehen nur du und deine bestätigten Freunde. Eigene Bahnen sind nur für dich und
        deine Freunde sichtbar. Ohne Freundschaft sieht niemand deine Fahrdaten.
      </p>

      <h2 className={H2}>4. Rechtsgrundlagen</h2>
      <ul className="list-disc pl-5">
        <li>Bereitstellung der App und deines Kontos: Art. 6 Abs. 1 lit. b DSGVO (Nutzungsvertrag).</li>
        <li>Sicherer Betrieb und Fehlerbehebung (Server-Protokolle): Art. 6 Abs. 1 lit. f DSGVO.</li>
        <li>Push-Benachrichtigungen: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung, jederzeit im Profil widerrufbar).</li>
      </ul>

      <h2 className={H2}>5. Empfänger und Auftragsverarbeiter</h2>
      <ul className="list-disc pl-5">
        <li><strong>Supabase</strong> (Datenbank und Anmeldung, Rechenzentrum Frankfurt, EU).</li>
        <li><strong>Netlify</strong> (Hosting der Website; eine Verarbeitung auch in den USA ist möglich, abgesichert über Standardvertragsklauseln).</li>
        <li>Je nach Browser der Push-Dienst deines Geräteherstellers (Google, Apple, Mozilla), wenn du Push aktivierst.</li>
      </ul>

      <h2 className={H2}>6. Cookies und lokaler Speicher</h2>
      <p>
        Wir setzen nur technisch notwendige Cookies für die Anmeldung. Zusätzlich speichert die App auf deinem
        Gerät einen Zwischenspeicher (Service Worker) und eine Warteschlange für Sessions, die du offline einträgst.
        Es gibt keine Werbe- oder Analyse-Cookies.
      </p>

      <h2 className={H2}>7. Speicherdauer</h2>
      <p>
        Wir speichern deine Daten, bis du dein Konto löschst. Beim Löschen werden dein Konto, deine Sessions,
        Rundenzeiten, Freundschaften, Achievements und Belohnungen entfernt. Von dir angelegte Bahnen, auf denen
        andere gefahren sind, bleiben bestehen und werden öffentlich (ohne Bezug zu dir). Server-Protokolle löschen
        die Anbieter nach ihren üblichen Fristen.
      </p>

      <h2 className={H2}>8. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch
        sowie das Recht, dich bei einer Datenschutzaufsichtsbehörde zu beschweren. Eine Kopie deiner Daten
        und die Löschung deines Kontos findest du direkt in der App unter{" "}
        <Link href="/profile" className="underline">Profil</Link>. Für alles Weitere schreib an die oben genannte Adresse.
      </p>
    </main>
  );
}
