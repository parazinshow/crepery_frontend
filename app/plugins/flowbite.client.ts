// app/plugins/flowbite.client.ts
import { initFlowbite } from "flowbite";
import "flowbite";

export default defineNuxtPlugin((nuxtApp) => {
	nuxtApp.hook("page:finish", () => {
		// É chamado toda vez que uma página termina de carregar/renderizar no client
		initFlowbite();
	});
});
