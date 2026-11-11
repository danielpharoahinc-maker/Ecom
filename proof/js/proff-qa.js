// Everything Proff knows. Plain answers, written to match what the app does
// today. Edit freely: `k` holds extra words people might type when searching.

export const TOPICS = ['Getting started', 'Posting proof', 'Streaks & score', 'Planning', 'Vault & stats', 'Clubs', 'Free & Pro', 'Privacy & account'];

export const QA = [
  // Getting started
  { t: 0, q: 'What is Proof?', k: 'about app what does it do',
    a: 'Proof helps you keep three daily commitments. You post a photo and a few words as proof each time you do one. Your streak, stats and club keep you honest.' },
  { t: 0, q: 'Who are you?', k: 'proff mascot who name',
    a: 'I’m Proff, the stamp that approves your proof. I explain things and answer questions. Tap me any time.' },
  { t: 0, q: 'How do I start?', k: 'begin first steps new',
    a: 'Tap the big red + at the bottom, take a photo of what you’re doing, say or type a few words, and tap Post proof. That’s it.' },
  { t: 0, q: 'How do I put Proof on my home screen?', k: 'install app icon add home screen safari chrome',
    a: 'Safari on iPhone: tap Share, then Add to Home Screen, then Add. Chrome on Android: tap ⋮, then Add to Home screen or Install app. Then Proof opens full screen like a normal app.' },
  { t: 0, q: 'Is Proof a real app?', k: 'app store download web',
    a: 'Proof is a web app: it runs in your browser, and once it’s on your home screen it works like any other app. You don’t need the App Store.' },
  { t: 0, q: 'Does it work without internet?', k: 'offline signal data',
    a: 'Yes. You can open Proof and post proof without signal. Signing in needs internet.' },

  // Posting proof
  { t: 1, q: 'What counts as proof?', k: 'photo evidence valid',
    a: 'A photo of you doing the thing: the gym, your open book, your laptop with the work on it. If a photo doesn’t fit, like prayer, switch to Voice and say what you did.' },
  { t: 1, q: 'Can I post more than once a day?', k: 'multiple again another twice second extra',
    a: 'Yes. Post as often as you like. For your streak and score, one proof per commitment per day is what counts.' },
  { t: 1, q: 'What’s the difference between Photo and Voice?', k: 'voice mode audio record',
    a: 'Photo is a picture plus a few words. Voice is just you saying what you did, for things you can’t photograph.' },
  { t: 1, q: 'What is a Moment?', k: 'moment extra photo day',
    a: 'A photo from your day that isn’t one of your three commitments. Moments tell your story, but they don’t count toward your streak or score.' },
  { t: 1, q: 'Can I upload a photo I already took?', k: 'gallery library camera roll',
    a: 'Yes. On the camera screen, tap the picture icon on the left to choose from your photos.' },
  { t: 1, q: 'How do I delete a proof?', k: 'remove mistake wrong',
    a: 'Open it in your Vault, tap the bin icon, then confirm. Your streak and stats update straight away.' },
  { t: 1, q: 'Why can’t I use the camera?', k: 'camera blocked permission not working allow',
    a: 'Your phone hasn’t allowed it yet. iPhone: Settings, then Safari, then Camera, then Allow. Android: tap the icon next to the web address, then Permissions. You can always pick a photo from your library instead.' },

  // Streaks & score
  { t: 2, q: 'How does my streak work?', k: 'streak days in a row',
    a: 'Every day you post proof for at least one of your commitments, your streak grows. Today only breaks it once the day is over, so you always have until midnight.' },
  { t: 2, q: 'What breaks my streak?', k: 'lose reset miss day',
    a: 'A full day with no commitment proof. Moments don’t keep it alive.' },
  { t: 2, q: 'How is my score out of 10 worked out?', k: 'score rating 10 week coach elite',
    a: 'I count how many of your three commitments you proved each day over the last 7 days. All 21 done is 10/10. Each missed one costs a little.' },
  { t: 2, q: 'What do the ratings mean?', k: 'elite locked in perfect strong solid',
    a: '10 is a Perfect week, 9 Elite, 8 Locked in, 7 Strong, 6 Solid, 5 Halfway there. Below that you’re building or restarting, and that’s fine. Just post today.' },
  { t: 2, q: 'What is a perfect day?', k: 'all three',
    a: 'A day where you proved all three commitments.' },

  // Planning
  { t: 3, q: 'How do I plan my day?', k: 'plan today list talk',
    a: 'On Today, tap the mic and say your plan the way you’d tell a friend: “Gym at 6, then school, read before bed.” I turn it into a list. You can type it too.' },
  { t: 3, q: 'Why did some plan items get ticked by themselves?', k: 'auto tick linked done',
    a: 'Items that match a commitment, like “gym” and Train, tick themselves off when you post proof for that commitment.' },
  { t: 3, q: 'How do I remove a plan item?', k: 'delete plan item x',
    a: 'Tap the small × on the right of the item.' },
  { t: 3, q: 'Does my plan carry over to tomorrow?', k: 'tomorrow reset new day',
    a: 'No. Each day starts with a fresh plan, so you decide again every morning.' },

  // Vault & stats
  { t: 4, q: 'What is the Vault?', k: 'vault photos history',
    a: 'Every proof you’ve posted, kept day by day as framed prints. Hold the door to open it, and I’ll score your week inside.' },
  { t: 4, q: 'Why do I have to hold to open the Vault?', k: 'hold door locked',
    a: 'Because it’s worth opening on purpose. It stays open until you close the app.' },
  { t: 4, q: 'What is Recap?', k: 'recap video slideshow',
    a: 'A quick slideshow of your last 30 days of photos. It’s a good one to screen-record and share.' },
  { t: 4, q: 'What does the Stats screen show?', k: 'stats consistency day by day',
    a: 'Your streak, how consistent you’ve been, every day stacked as a list with a mark for each commitment, and how each commitment is going.' },

  // Clubs
  { t: 5, q: 'What is a club?', k: 'club crew friends group',
    a: 'A small group of friends who lock in together. Everyone sees who’s posted today, so nobody hides.' },
  { t: 5, q: 'How do I invite friends?', k: 'invite code share join',
    a: 'In Club, tap Invite and share your 6-letter code. They enter it under Club, then Join with a code.' },
  { t: 5, q: 'Who can see my photos?', k: 'see photo private visible who strangers public',
    a: 'Only you, and people in a club you’ve joined. Nobody else can see your proof.' },
  { t: 5, q: 'Can club members see my answers or email?', k: 'email private answers obstacle',
    a: 'No. They only see your first name and your proof.' },
  { t: 5, q: 'How do I leave a club?', k: 'leave exit club',
    a: 'In Club, tap the settings icon at the top, then Leave club. You can rejoin with the code later.' },

  // Free & Pro
  { t: 6, q: 'Is Proof free?', k: 'free cost price',
    a: 'You get 21 free posts, about a full week. After that, Proof Pro keeps you posting.' },
  { t: 6, q: 'How much is Pro?', k: 'pro price cost rand',
    a: 'R49 a month or R399 a year. Yearly saves about a third.' },
  { t: 6, q: 'What happens after my free posts?', k: 'limit run out 21',
    a: 'You can still open your Vault, Stats, plans and Club. Posting new proof needs Pro.' },
  { t: 6, q: 'How do I cancel Pro?', k: 'cancel subscription stop',
    a: 'Cancel any time through the email receipt from Paystack. You keep Pro until the end of what you’ve paid for.' },
  { t: 6, q: 'Is paying safe?', k: 'payment card secure paystack',
    a: 'Payments go through Paystack’s secure page. Proof never sees your card details.' },

  // Privacy & account
  { t: 7, q: 'Is my data private?', k: 'privacy safe data secure',
    a: 'Yes. Your profile, answers and plans are only yours. Your proof is visible only to your clubs. Strangers can’t see anything.' },
  { t: 7, q: 'Are my photos backed up?', k: 'backup sync new phone lost',
    a: 'Not yet. Right now your photos are saved on the phone you posted them from. Backing up to your account is coming.' },
  { t: 7, q: 'How do I sign in?', k: 'login sign in email link code password',
    a: 'Type your email and tap the link we send you. No password needed. Check spam if it doesn’t arrive.' },
  { t: 7, q: 'Can I change my commitments?', k: 'change edit commitments swap',
    a: 'Not yet. That’s coming soon. Pick the three that matter most for now.' },
  { t: 7, q: 'Will Proof remind me to post?', k: 'reminder notification alert remind ping',
    a: 'Yes, if you let me. Tap your initial on Today, then Reminders. I nudge you at your proof time, at 8 pm if your streak is at risk, and 10 minutes before anything timed in your plan. On iPhone, add Proof to your home screen first.' },
  { t: 7, q: 'Why am I not getting reminders?', k: 'not getting notifications reminders no ping silent',
    a: 'Check three things: Proof is on your home screen (iPhone needs this), notifications for Proof are allowed in your phone’s Settings, and Reminders are on in Account. Then tap “Send me a test”.' },
  { t: 7, q: 'How do I delete my data?', k: 'delete account data remove',
    a: 'Tap your initial at the top of Today, then Delete all my data. It can’t be undone.' },
];
