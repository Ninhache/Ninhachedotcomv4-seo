import "../../globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Sidebar } from "@/components/shell/sidebar";
import Providers from "./providers";

export const metadata: Metadata = {
	title: "Admin",
	description: "Admin desc",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
	return (
		<Providers>
			<div className="min-h-dvh bg-muted/20">
				<div className="mx-auto max-w-7xl">
					<div className="grid lg:grid-cols-[260px_1fr]">
						<aside className="sticky top-0 hidden h-dvh border-r bg-background lg:block">
							<Sidebar />
						</aside>
						<main className="min-h-dvh p-4 md:p-6">{children}</main>
					</div>
				</div>
			</div>
		</Providers>
	);
}
