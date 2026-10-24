/* snark.js — what a student hears when they pile double bonds onto a
 * central atom that already has its electrons.
 *
 * In this class double bonds come from Rule 5 only, and Rule 5 only runs while
 * the central atom is electron deficient. In SO₂ and SO₃ that means exactly
 * ONE S=O double bond: S has 8 as soon as one O shares a pair. A second or
 * third S=O — the "reduce the formal charge" answer from college textbooks and
 * AI chatbots — means the student did not follow the 5 rules. (The first
 * double bond is right, so these lines say "another" / "extra", never "a
 * double bond on S".) They get one of these, then the actual fix.
 *
 * Same file as the Lewis structures activity, with the lines reworded for
 * resonance.
 *
 * Nothing here is reported to the LMS. The count of offenses lives only in
 * the open page, so it starts over if the student reloads.
 *
 * The *Oxy lines say outright that a chatbot draws it that way. That is true
 * for oxyanions and oxyacids (S=O, P=O, Cl=O), so they are only used when the
 * species has O in it; for SF₆, XeF₄, PCl₅ and the like nobody draws S=F or
 * Xe=F, so those get the other lines.
 *
 * Placeholders: {X} the central atom, {F} the formula, {e} how many electrons
 * {X} already has, {n} how many times.
 */

var SNARK = {

  /* first offense, in a build — one of these, at random */
  first: [
    'Interesting. Rule 5 says IF the central atom is electron deficient. {X} has {e}. The only thing telling ' +
      'you to give it more is a chatbot. Close that tab and follow the 5 simple rules your teacher taught you.',
    'Beep boop. This answer smells like AI. Nothing in the 5 rules your teacher taught you says to pile double ' +
      'bonds onto a central atom that already has {e} electrons. Put the chatbot down and follow the rules.'
  ],
  /* ...and these too, when the species has O in it */
  firstOxy: [
    'Oh, ANOTHER double bond on {X}? Fancy. That’s how an AI chatbot draws {F}, and it is not how this class ' +
      'does it. Quit using AI to look up your chemistry answers and follow the 5 simple rules your teacher taught you.',
    'Let me guess: the internet gave {X} a double bond to every O. The internet is not your chemistry teacher. ' +
      'Stop looking up answers with AI and use the 5 simple rules you were taught.'
  ],

  /* first offense, on a checkpoint question (the explanation underneath gives the fix) */
  quiz: [
    'Nice try, chatbot. Rule 5 stops the moment the central atom has 8 — one double bond, not a pile of them. ' +
      'Put the AI away and follow the 5 simple rules your teacher taught you.',
    'Rule 5 fixes a central atom that is SHORT, and stops when it has 8. Extra double bonds after that are the ' +
      'AI answer. Put the AI down and follow the 5 simple rules your teacher taught you.'
  ],
  /* ...and these too, when the question is about a species with O in it */
  quizOxy: [
    'That’s the AI answer. Quit using AI to look up your chemistry answers and follow the 5 simple rules your ' +
      'teacher taught you.',
    'Extra double bonds on a central atom that already had its electrons? That’s what a chatbot would pick. ' +
      'Rule 5 only fixes a central atom that is short — follow the 5 simple rules.'
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
