/* snark.js — what a student hears when they pile double bonds onto a
 * central atom that already has its electrons.
 *
 * In this class double bonds come from Rule 5 only, and Rule 5 only runs when
 * the central atom is electron deficient. Drawing S=O double bonds in sulfate
 * or phosphoric acid — the "reduce the formal charge" answer from college
 * textbooks and AI chatbots — means the student did not follow the 5 rules.
 * (More than 8 is NOT the problem by itself: the rules give S 12 in SF₆ and
 * Xe 12 in XeF₄. The problem is a double bond the rules never asked for, on
 * a central atom from period 3 or below.) They get one of these, then the
 * actual fix.
 *
 * Nothing here is reported to the LMS. The count of offenses lives only in
 * the open page, so it starts over if the student reloads.
 *
 * Placeholders: {X} the central atom, {F} the formula, {e} how many electrons
 * {X} already has, {n} how many times.
 */

var SNARK = {

  /* first offense, in a build — one of these, at random */
  first: [
    'Oh, a double bond on {X}? Fancy. That’s how an AI chatbot draws {F}, and it is not how this class does ' +
      'it. Quit using AI to look up your chemistry answers and follow the 5 simple rules your teacher taught you.',
    'Interesting. Rule 5 says IF the central atom is electron deficient. {X} has {e}. The only thing telling ' +
      'you to give it more is a chatbot. Close that tab and follow the 5 simple rules your teacher taught you.',
    'Let me guess: the internet says {X} gets double bonds. The internet is not your chemistry teacher. Stop ' +
      'looking up answers with AI and use the 5 simple rules you were taught.',
    'Beep boop. This answer smells like AI. Nothing in the 5 rules your teacher taught you says to pile double ' +
      'bonds onto a central atom that already has {e} electrons. Put the chatbot down and follow the rules.'
  ],

  /* first offense, on a checkpoint question (the explanation underneath gives the fix) */
  quiz: [
    'That’s the AI answer. Quit using AI to look up your chemistry answers and follow the 5 simple rules your ' +
      'teacher taught you.',
    'Extra double bonds on a central atom that already had its electrons? That’s what a chatbot would pick. ' +
      'Rule 5 only fixes a central atom that is short — follow the 5 simple rules.',
    'Nice try, chatbot. In this class double bonds only come from Rule 5, and only when the central atom is ' +
      'short. Put the AI away and follow the 5 simple rules your teacher taught you.'
  ],

  /* second offense and after, anywhere */
  again: [
    'Again? Your AI isn’t enrolled in this class — you are. Quit looking up answers and follow the 5 simple rules.',
    'Strike {n}. Same advice as before: put the chatbot away and follow the 5 rules your teacher taught you.',
    'Still adding double bonds nobody asked for? The chatbot is still wrong for this class. Five simple rules. ' +
      'Follow them.'
  ],

  /* always added after the snark in a build: the real fix */
  fix: '{X} already has {e} electrons, so it is not electron deficient and Rule 5 does not apply. ',

  /* ...and a push to do their own work */
  cheer: [
    'You don’t need to look anything up — the 5 rules and the periodic table are all it takes.',
    'Trust the rules. They work every time in this class.',
    'You’ve got this — just follow the rules in order.'
  ]
};
