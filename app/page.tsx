import { FileExplorer } from './components/FileExplorer';

export default function Home() {
  return (
    <main className="page">
      <header className="page__intro">
        <div>
          <h1>File Explorer</h1>
        </div>
      </header>
      <FileExplorer />
    </main>
  );
}
