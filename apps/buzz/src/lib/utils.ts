import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('ko-KR').format(num);
}

export function generateReferralLink(referralCode: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/signup?ref=${referralCode}`;
}

export function shareToSNS(platform: 'kakao' | 'facebook' | 'twitter' | 'line' | 'copy', content: {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
}) {
  const { title, description, url, imageUrl } = content;
  
  switch (platform) {
    case 'kakao':
      // Kakao sharing implementation
      if (typeof window !== 'undefined' && (window as any).Kakao?.Share) {
        try {
          (window as any).Kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
              title: title,
              description: description,
              imageUrl: imageUrl || `${window.location.origin}/logo.png`,
              link: {
                mobileWebUrl: url,
                webUrl: url,
              },
            },
          });
        } catch (error) {
          console.error('Kakao sharing failed:', error);
          fallbackShare(url, `${title} - ${description}`);
        }
      } else {
        // Kakao SDK not loaded, fallback to web share or copy
        fallbackShare(url, `${title} - ${description}`);
      }
      break;
    case 'facebook':
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title + ' - ' + description)}`,
        '_blank',
        'width=600,height=400'
      );
      break;
    case 'twitter':
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}&via=BuzzKorea`,
        '_blank',
        'width=600,height=400'
      );
      break;
    case 'line':
      window.open(
        `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title + ' - ' + description)}`,
        '_blank',
        'width=600,height=400'
      );
      break;
    case 'copy':
      copyToClipboard(url, title);
      break;
  }
}

function fallbackShare(url: string, text: string) {
  if (navigator.share) {
    navigator.share({
      title: 'Buzz - 부산 남구',
      text: text,
      url: url,
    }).catch(console.error);
  } else {
    copyToClipboard(url, text);
  }
}

function copyToClipboard(url: string, title: string) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(`${title}\n${url}`).then(() => {
      // Show toast notification
      if (typeof window !== 'undefined' && (window as any).toast) {
        (window as any).toast({
          title: "링크 복사 완료!",
          description: "클립보드에 링크가 복사되었습니다.",
        });
      }
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = `${title}\n${url}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    });
  } else {
    // Fallback for very old browsers
    const textArea = document.createElement('textarea');
    textArea.value = `${title}\n${url}`;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    alert('링크가 클립보드에 복사되었습니다!');
  }
}