import { NotesPage } from "../../../notes-page";
import { notesMetadata } from "../../../site-metadata";

export const dynamic = "force-static";
export const metadata = notesMetadata("zh");

export default function ChineseNotes() {
  return <NotesPage language="zh" />;
}
