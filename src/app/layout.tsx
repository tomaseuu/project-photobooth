// app/layout.tsx
import "./globals.css";
import Footer from "../components/footer";
import Navbar from "../components/navbar";

export const metadata = {
  title: "Luma Leaf",
  description: "A personal photobooth for you and your favorite people",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <div className="wrapper">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
