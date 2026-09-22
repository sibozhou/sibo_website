import { NotesPage } from "../../notes-page";
import { notesMetadata } from "../../site-metadata";

export const dynamic = "force-static";
export const metadata = notesMetadata("en");

export default function Notes() {
  return <NotesPage />;
}
