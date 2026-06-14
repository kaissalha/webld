"use client";

import { useEffect, useRef, useState } from "react";

import Image from "next/image";

import { LoginTestimonials } from "./login-testimonials";

const POSTER =
	"https://midday.ai/cdn-cgi/image/width=1000,quality=80,format=auto/https://cdn.midday.ai/video-poster-v2.jpg";

export const LoginVideoBackground = () => {
	const [isVideoLoaded, setIsVideoLoaded] = useState(false);
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		const video = videoRef.current;
		if (!video) {
			return;
		}

		const handleCanPlay = () => {
			setIsVideoLoaded(true);
		};

		const handleLoadedData = () => {
			setIsVideoLoaded(true);
		};

		const handleCanPlayThrough = () => {
			setIsVideoLoaded(true);
		};

		/** Some browsers (notably WebKit) fail to apply `loop` for remote assets; `ended` restarts the clip. */
		const handleEnded = () => {
			video.currentTime = 0;
			void video.play().catch(() => {
				// ignore missing gesture / background tab restrictions
			});
		};

		const nudgePlay = () => {
			if (video.paused) {
				void video.play().catch(() => {});
			}
		};

		video.loop = true;
		video.muted = true;
		// Inert setAttribute in case the browser only reads initial props.
		video.setAttribute("muted", "");
		video.setAttribute("playsinline", "");

		if (video.readyState >= 3) {
			setIsVideoLoaded(true);
		}

		video.addEventListener("canplay", handleCanPlay);
		video.addEventListener("loadeddata", handleLoadedData);
		video.addEventListener("canplaythrough", handleCanPlayThrough);
		video.addEventListener("ended", handleEnded);
		video.addEventListener("stalled", nudgePlay);

		return () => {
			video.removeEventListener("canplay", handleCanPlay);
			video.removeEventListener("loadeddata", handleLoadedData);
			video.removeEventListener("canplaythrough", handleCanPlayThrough);
			video.removeEventListener("ended", handleEnded);
			video.removeEventListener("stalled", nudgePlay);
		};
	}, []);

	return (
		<div className='m-2 relative hidden overflow-hidden rounded-lg border border-border lg:flex lg:w-1/2'>
			<div
				className={`absolute inset-0 h-full w-full transition-all duration-1000 ease-in-out ${
					isVideoLoaded ? "pointer-events-none opacity-0" : "opacity-100"
				}`}
				style={{
					filter: isVideoLoaded ? "blur(0px)" : "blur(1px)",
				}}
			>
				<div className='relative h-full w-full'>
					<Image
						src={POSTER}
						alt=''
						aria-hidden
						className='object-cover'
						fill
						priority
						sizes='(min-width: 1024px) 50vw, 0px'
					/>
				</div>
			</div>

			<video
				ref={videoRef}
				className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
					isVideoLoaded ? "opacity-100" : "opacity-0"
				}`}
				autoPlay
				loop
				muted
				playsInline
				preload='auto'
				poster={POSTER}
			>
				<source src='https://cdn.midday.ai/videos/login-video.mp4' type='video/mp4' />
			</video>

			<div className='absolute inset-0 bg-black/20' />

			<div className='relative z-10 flex h-full w-full flex-col items-center justify-center p-2 text-center'>
				<div className='max-w-lg'>
					<LoginTestimonials />
				</div>
			</div>
		</div>
	);
};
