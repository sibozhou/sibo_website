import { NotesPage } from "../../../notes-page";
import { notesMetadata } from "../../../site-metadata";

export const dynamic = "force-static";
export const metadata = notesMetadata("zh-hant");

export default function TraditionalNotes() {
  return <NotesPage language="zh-hant" />;
}
