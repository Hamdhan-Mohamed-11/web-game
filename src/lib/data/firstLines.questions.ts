// Display text only — no correct-answer info here (that lives in the DB,
// see supabase/migrations/0004_seed.sql). question_index below must line up
// 1:1 with question_state.question_index for round_key 'main'.

export interface FirstLinesQuestion {
  questionIndex: number;
  line: string;
  choices: [string, string, string, string];
}

export const FIRST_LINES_QUESTIONS: readonly FirstLinesQuestion[] = [
  {
    questionIndex: 0,
    line: '"Call me Ishmael."',
    choices: ["Moby-Dick", "Dracula", "Jane Eyre", "Little Women"],
  },
  {
    questionIndex: 1,
    line: '"It is a truth universally acknowledged..."',
    choices: ["Emma", "Pride and Prejudice", "Jane Eyre", "Wuthering Heights"],
  },
  {
    questionIndex: 2,
    line: '"It was the best of times, it was the worst of times..."',
    choices: ["Great Expectations", "Oliver Twist", "A Tale of Two Cities", "David Copperfield"],
  },
  {
    questionIndex: 3,
    line: '"There was no possibility of taking a walk that day."',
    choices: ["Jane Eyre", "Little Women", "Emma", "Dracula"],
  },
  {
    questionIndex: 4,
    line: '"Alice was beginning to get very tired of sitting by her sister..."',
    choices: [
      "Peter Pan",
      "Alice's Adventures in Wonderland",
      "The Secret Garden",
      "The Wonderful Wizard of Oz",
    ],
  },
  {
    questionIndex: 5,
    line: '"Christmas won\'t be Christmas without any presents," grumbled Jo.',
    choices: ["Little Women", "Anne of Green Gables", "Heidi", "Black Beauty"],
  },
  {
    questionIndex: 6,
    line: '"The studio was filled with the rich odour of roses..."',
    choices: ["Dracula", "The Picture of Dorian Gray", "Frankenstein", "The Great Gatsby"],
  },
  {
    questionIndex: 7,
    line: '"To Sherlock Holmes she is always the woman."',
    choices: ["The Sign of Four", "A Study in Scarlet", "A Scandal in Bohemia", "The Final Problem"],
  },
  {
    questionIndex: 8,
    line: '"In my younger and more vulnerable years my father gave me some advice..."',
    choices: ["The Great Gatsby", "Moby-Dick", "The Sun Also Rises", "The Catcher in the Rye"],
  },
  {
    questionIndex: 9,
    line: '"The Time Traveller... was expounding a recondite matter to us."',
    choices: [
      "The Invisible Man",
      "The War of the Worlds",
      "The Time Machine",
      "Twenty Thousand Leagues Under the Seas",
    ],
  },
];
