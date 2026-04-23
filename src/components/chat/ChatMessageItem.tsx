'use client';

import { useEffect, useRef, useState } from 'react';
import { User as UserIcon, Wrench } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import EMOT_LIST from '@/emot/emot';

const BUBBLE_RADIUS = 'rounded-2xl';
const MOBILE_MEDIA_QUERY = '(max-width: 768px), (pointer: coarse)';
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
};
const normalizeEmotUrl = (url: string) => url.replace(/=w\d+-h\d+-c-k-nd$/i, '=s50');
const emotMap = new Map<string, { primaryUrl: string; fallbackUrl: string }>(
  EMOT_LIST.map((emot) => {
    const fallbackUrl = String(emot.url);
    return [
      String(emot.code).toLowerCase(),
      {
        primaryUrl: normalizeEmotUrl(fallbackUrl),
        fallbackUrl
      }
    ];
  })
);

interface ChatMessageItemProps {
  msg: any;
  isFullscreen?: boolean;
}

const OwnerBadge = () => (
  <span
    className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#ff3d3d]"
    title="Channel owner"
  >
    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-white" aria-hidden="true">
      <path d="M4 3.1v5.8L9 6 4 3.1Z" />
    </svg>
  </span>
);

const ModeratorBadge = () => (
  <span
    className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#5f9dff]"
    title="Moderator"
  >
    <Wrench className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
  </span>
);

const MemberBadge = () => (
  <span
    className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#2ba640]"
    title="Member"
  >
    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-white" aria-hidden="true">
      <path d="M6 10 2 6.4C1 5.4 1 3.8 2.1 2.8A2.8 2.8 0 0 1 6 3.3a2.8 2.8 0 0 1 3.9-.5c1 1 1 2.6 0 3.6L6 10Z" />
    </svg>
  </span>
);

const formatChatMessage = (text: string | undefined) => {
  if (!text) return null;
  // Mendukung format :nama-emot: agar bisa dirender sebagai gambar.
  const parts = text.split(/(:[a-zA-Z0-9_-]+:)/g);

  return parts.map((part, i) => {
    if (part.startsWith(':') && part.endsWith(':')) {
      const emotCode = part.slice(1, -1);
      const emotSource = emotMap.get(emotCode.toLowerCase());

      if (emotSource) {
        return (
          <img
            key={i}
            src={emotSource.primaryUrl}
            alt={emotCode}
            title={emotCode}
            className="inline-block h-[1.9em] w-[1.9em] align-[-0.3em] mx-[2px] object-contain"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.dataset.fallbackApplied === '1') return;
              target.dataset.fallbackApplied = '1';
              target.src = emotSource.fallbackUrl;
            }}
          />
        );
      }
    }

    return <span key={i}>{part}</span>;
  });
};

export default function ChatMessageItem({ msg, isFullscreen = false }: ChatMessageItemProps) {
  const chatRef = useRef<HTMLDivElement>(null);
  const [disableAnimation, setDisableAnimation] = useState(isMobileDevice);
  const [isMobileLayout, setIsMobileLayout] = useState(isMobileDevice);

  useGSAP(() => {
    if (disableAnimation) {
      gsap.set(chatRef.current, { opacity: 1, scale: 1, y: 0 });
      return;
    }

    // Timeline untuk animasi bertahap yang lebih terasa
    const tl = gsap.timeline();
    
    tl.set(chatRef.current, {
      opacity: 0,
      scale: 0.1,
      y: 120
    })
    .to(chatRef.current, {
      opacity: 1,
      scale: 1.15,      // Overshoot dulu
      y: 0,
      duration: 0.35,
      ease: "power3.out"
    })
    .to(chatRef.current, {
      scale: 0.95,      // Bounce back ke bawah
      duration: 0.12,
      ease: "power2.in"
    })
    .to(chatRef.current, {
      scale: 1.05,      // Bounce ke atas lagi
      duration: 0.08,
      ease: "power2.out"
    })
    .to(chatRef.current, {
      scale: 1,         // Settle ke ukuran normal
      duration: 0.08,
      ease: "power2.inOut"
    });
  }, { dependencies: [msg.id, disableAnimation], scope: chatRef });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const update = () => {
      setDisableAnimation(mediaQuery.matches);
      setIsMobileLayout(mediaQuery.matches);
    };
    update();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', update);
      return () => mediaQuery.removeEventListener('change', update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  const { isChatOwner, isChatModerator, isChatSponsor, displayName, profileImageUrl } = msg.authorDetails;
  const type = msg.snippet.type;

  let nameColor = "text-muted-foreground";
  let textColor = "text-foreground";
  let badgeIcon: JSX.Element | null = null;

  // Default background untuk chat biasa
  let customBg = "bg-card border-border";
  let messageContent = null;

  if (isChatOwner) {
    nameColor = "text-[#ffd600]";
    badgeIcon = <OwnerBadge />;
  } else if (isChatModerator) {
    nameColor = "text-[#5f9dff]";
    badgeIcon = <ModeratorBadge />;
  } else if (isChatSponsor) {
    nameColor = "text-[#2ba640] font-semibold";
    textColor = "text-foreground";
    badgeIcon = <MemberBadge />;
  }

  if (type === 'superChatEvent') {
    const details = msg.snippet.superChatDetails;
    customBg = "bg-yellow-500/15 border-yellow-500/40";
    messageContent = (
      <div className="flex flex-col mt-0.5">
        <span className={`font-black text-yellow-500 ${isFullscreen ? 'text-[11px]' : 'text-[13px]'}`}>{details?.amountDisplayString}</span>
        {details?.userComment && (
          <span className={`${isFullscreen ? 'text-[11px]' : 'text-[13px]'} leading-relaxed break-words text-foreground mt-0.5`}>
            {formatChatMessage(details.userComment)}
          </span>
        )}
      </div>
    );
  } else if (type === 'superStickerEvent') {
    const details = msg.snippet.superStickerDetails;
    customBg = "bg-cyan-500/15 border-cyan-500/40";
    messageContent = (
      <div className="flex flex-col mt-0.5">
        <span className={`font-black text-cyan-400 ${isFullscreen ? 'text-[11px]' : 'text-[13px]'}`}>{details?.amountDisplayString}</span>
        {details?.superStickerMetadata?.url && (
          <img
            src={details.superStickerMetadata.url}
            alt={details.superStickerMetadata.altText}
            className="h-14 w-14 mt-1 object-contain drop-shadow-lg"
          />
        )}
      </div>
    );
  } else if (type === 'newSponsorEvent') {
    customBg = "bg-green-500/15 border-green-500/40";
    messageContent = (
      <div className="flex flex-col mt-0.5">
        <span className={`font-bold text-green-400 ${isFullscreen ? 'text-[10px]' : 'text-[12px]'} uppercase tracking-wide flex items-center gap-1`}>
          🎉 Welcome to {msg.snippet.newSponsorDetails?.memberLevelName || 'Membership'}!
        </span>
      </div>
    );
  } else if (type === 'membershipGiftingEvent') {
    const details = msg.snippet.membershipGiftingDetails;
    customBg = "bg-green-500/15 border-green-500/40";
    messageContent = (
      <div className="flex flex-col mt-0.5">
        <span className={`font-bold text-green-400 ${isFullscreen ? 'text-[11px]' : 'text-[13px]'} uppercase tracking-wide`}>
          🎁 Merch/Member Gift!
        </span>
        <span className={`${isFullscreen ? 'text-[11px]' : 'text-[13px]'} text-white mt-0.5`}>
          Berhasil memberikan {details?.giftCount || 1} membership.
        </span>
      </div>
    );
  } else if (type === 'memberMilestoneChatEvent') {
    const details = msg.snippet.memberMilestoneChatDetails;
    customBg = "bg-green-500/15 border-green-500/40";
    messageContent = (
      <div className="flex flex-col mt-0.5">
        <span className={`font-bold text-green-400 ${isFullscreen ? 'text-[10px]' : 'text-[12px]'} uppercase tracking-wide`}>
          ⭐ Member for {details?.memberMonth} months!
        </span>
        {details?.userComment && (
          <span className={`${isFullscreen ? 'text-[11px]' : 'text-[13px]'} leading-relaxed break-words text-foreground mt-0.5`}>
            {formatChatMessage(details.userComment)}
          </span>
        )}
      </div>
    );
  } else if (type === 'textMessageEvent') {
    // Teks Biasa (textMessageEvent)
    const textMessage = msg.snippet.textMessageDetails?.messageText || msg.snippet.displayMessage;
    if (!textMessage) return null; // Sembunyikan bubble jika tidak ada pesan

    messageContent = (
      <span className={`${isFullscreen ? 'text-[11px]' : 'text-[10px] sm:text-[11px] md:text-[13px]'} leading-relaxed break-words relative z-10 ${textColor}`}>
        {formatChatMessage(textMessage)}
      </span>
    );
  } else {
    // Event sistem seperti timeout moderator (menghindari bubble kosong)
    if (!msg.snippet.displayMessage) return null;

    messageContent = (
      <span className={`${isFullscreen ? 'text-[11px]' : 'text-[13px]'} italic opacity-70 leading-relaxed break-words relative z-10 ${textColor}`}>
        {formatChatMessage(msg.snippet.displayMessage)}
      </span>
    );
  }

  const isMobileFlatText = type === 'textMessageEvent' && !isFullscreen && isMobileLayout;

  return (
    <div ref={chatRef} className={`flex items-start w-full group ${isFullscreen ? 'gap-1.5' : 'gap-1.5 sm:gap-2 md:gap-2.5'}`}>
      <Avatar className={`mt-0.5 shrink-0 border border-border ${isFullscreen ? 'h-5 w-5' : 'h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7'}`}>
        <AvatarImage src={profileImageUrl} />
        <AvatarFallback><UserIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" /></AvatarFallback>
      </Avatar>

      <div className={`flex flex-col flex-1 min-w-0 relative overflow-hidden ${isMobileFlatText ? 'border-0 bg-transparent rounded-none p-0' : `border ${BUBBLE_RADIUS} ${isFullscreen ? 'p-1.5' : 'p-1.5 sm:p-2 md:p-2 lg:p-3'} ${customBg}`}`}>
        {isMobileFlatText ? (
          <div className="flex items-baseline gap-1.5 flex-wrap min-w-0">
            <span className={`text-[12px] font-bold tracking-tight ${nameColor}`}>
              {displayName}
            </span>
            {badgeIcon}
            <div className="text-[12px] leading-relaxed break-words text-foreground">
              {messageContent}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap mb-0.5 sm:mb-1 relative z-10">
              <span className={`${isFullscreen ? 'text-[10px]' : 'text-[10px] sm:text-[11px] md:text-[12px]'} font-bold tracking-tight ${nameColor}`}>
                {displayName}
              </span>
              {badgeIcon}
            </div>
            <div className="relative z-10">
              {messageContent}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
