/** @type {import('tailwindcss').Config} */
module.exports = {
	content: [
		"./app/components/**/*.{vue,js,ts}",
		"./app/layouts/**/*.vue",
		"./app/pages/**/*.vue",
		"./app/plugins/**/*.{js,ts}",
		"./app/app.vue",

		"./app.vue",
		"./components/**/*.{vue,js,ts}",
		"./pages/**/*.vue",
		"./plugins/**/*.{js,ts}",
		"./error.vue",

		"./node_modules/flowbite/**/*.js",
		"./node_modules/flowbite-vue/**/*.{js,jsx,ts,tsx}",
	],
	theme: {
		extend: {
			colors: {
				primary: {
					50: "#fffbeb",
					100: "#fef3c7",
					200: "#fde68a",
					300: "#fcd34d",
					400: "#fbbf24",
					500: "#f59e0b",
					600: "#d97706",
					700: "#b45309",
					800: "#92400e",
					900: "#78350f",
					950: "#451a03",
				},
			},
		},
		fontFamily: {
			// fonte “padrão” do site
			sans: [
				"Poppins",
				"ui-sans-serif",
				"system-ui",
				"Segoe UI",
				"Roboto",
				"Helvetica Neue",
				"Arial",
				"Noto Sans",
				"sans-serif",
			],
			// opção para títulos, se quiser
			heading: [
				"Lora",
				"ui-serif",
				"Georgia",
				"Cambria",
				"Times New Roman",
				"Times",
				"serif",
			],
		},
	},
	plugins: [require("flowbite/plugin")],
};
