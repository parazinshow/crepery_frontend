<template>
	<header>
		<nav class="bg-primary-100 px-2.5 sm:px-5 py-2.5 h-20 overflow-x-hidden">
			<div
				class="flex flex-wrap justify-between items-center mx-auto max-w-screen-xl h-full"
			>
				<!-- Logo -->
				<a href="https://www.thecrepegirl.co/" class="flex items-center">
					<div class="flex items-center">
						<img
							src="/images/logo-image.png"
							class="h-16 mr-3"
							alt="Logo image"
						/>
						<img
							src="/images/logo-text.png"
							class="h-10 sm:h-14 w-auto"
							alt="Logo text"
						/>
					</div>
				</a>
				<!-- Ações à direita -->
				<div class="flex items-center lg:order-2">
					<!-- ORDER NOW fora do menu apenas no desktop -->
					<a
						href="#"
						class="hidden lg:inline-flex text-white bg-primary-700 hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 font-medium rounded-lg text-sm px-5 py-2.5"
					>
						ORDER NOW
					</a>
					<!-- Botão hamburger (mobile) -->
					<button
						data-collapse-toggle="mobile-menu-2"
						type="button"
						class="inline-flex items-center p-2 ml-2 text-sm rounded-lg"
					>
						<!-- ícones -->
						<svg
							class="w-6 h-6"
							fill="text-gray-900"
							viewBox="0 0 20 20"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								fill-rule="evenodd"
								d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
								clip-rule="evenodd"
							></path>
						</svg>
					</button>
				</div>
				<!-- Menu colapsável -->
				<div
					id="mobile-menu-2"
					class="hidden justify-between items-center w-full lg:flex lg:w-auto lg:order-1 p-2"
				>
					<ul
						class="flex flex-col items-center font-medium space-y-2 lg:flex-row lg:space-x-8 lg:space-y-0"
					>
						<!-- Mobile: ORDER NOW dentro do menu -->
						<li class="lg:hidden">
							<a
								href="#"
								class="inline-flex justify-center text-white bg-primary-700 font-bold rounded-lg text-sm px-4 py-2"
							>
								ORDER NOW
							</a>
						</li>
						<li><a href="#" class="mobile-nav-item">MENU</a></li>
						<li><a href="#" class="mobile-nav-item">CAKES</a></li>
						<li><a href="#" class="mobile-nav-item">RETAIL</a></li>
						<li><a href="#" class="mobile-nav-item">CATERING</a></li>
						<li><a href="#" class="mobile-nav-item">OUR STORY</a></li>
					</ul>
				</div>
			</div>
		</nav>
	</header>
</template>
<script setup></script>
