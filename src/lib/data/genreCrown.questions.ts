// Display text only. question_index must line up with question_state rows
// for round_key 'fiction' / 'nonfiction' respectively (see 0004_seed.sql).

export interface GenreCrownQuestion {
  questionIndex: number;
  question: string;
  choices: [string, string, string, string];
}

export const GENRE_CROWN_FICTION_QUESTIONS: readonly GenreCrownQuestion[] = [
  {
    questionIndex: 0,
    question: "Who wrote the Harry Potter series?",
    choices: ["J.R.R. Tolkien", "J.K. Rowling", "Andy Weir", "Arthur Conan Doyle"],
  },
  {
    questionIndex: 1,
    question: "Who created Sherlock Holmes?",
    choices: ["Agatha Christie", "Arthur Conan Doyle", "Charles Dickens", "George Orwell"],
  },
  {
    questionIndex: 2,
    question: "Who is Sherlock Holmes's famous friend and companion?",
    choices: ["Dr. John Watson", "Inspector Morse", "Hercule Poirot", "Mycroft Holmes"],
  },
  {
    questionIndex: 3,
    question: "Who wrote The Lord of the Rings?",
    choices: ["C.S. Lewis", "George R.R. Martin", "J.R.R. Tolkien", "J.K. Rowling"],
  },
  {
    questionIndex: 4,
    question: "Who is the main character in The Hobbit?",
    choices: ["Frodo Baggins", "Bilbo Baggins", "Samwise Gamgee", "Thorin Oakenshield"],
  },
  {
    questionIndex: 5,
    question: "Who wrote Project Hail Mary?",
    choices: ["Andy Weir", "Isaac Asimov", "Frank Herbert", "Ernest Cline"],
  },
];

export const GENRE_CROWN_NONFICTION_QUESTIONS: readonly GenreCrownQuestion[] = [
  {
    questionIndex: 0,
    question: "Which idea is strongly linked with The Secret?",
    choices: ["Deep work", "The law of attraction", "Compound interest", "Design thinking"],
  },
  {
    questionIndex: 1,
    question: "Who wrote Thinking, Fast and Slow?",
    choices: ["Adam Grant", "Daniel Kahneman", "Malcolm Gladwell", "James Clear"],
  },
  {
    questionIndex: 2,
    question: "Who wrote Atomic Habits?",
    choices: ["Robin Sharma", "Stephen R. Covey", "James Clear", "Simon Sinek"],
  },
  {
    questionIndex: 3,
    question: "Who wrote The 5 AM Club?",
    choices: ["Robin Sharma", "Robert Greene", "Cal Newport", "Dale Carnegie"],
  },
  {
    questionIndex: 4,
    question: "Grit is mainly described as a combination of passion and what?",
    choices: ["Intelligence", "Luck", "Perseverance", "Creativity"],
  },
  {
    questionIndex: 5,
    question: "Who wrote The 7 Habits of Highly Effective People?",
    choices: ["Stephen R. Covey", "Jim Collins", "Peter Drucker", "Napoleon Hill"],
  },
];
