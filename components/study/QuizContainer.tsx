"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ArrowRight, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { QuizQuestion, QuizResult } from "@/lib/types/study.types";

interface QuizContainerProps {
  questions: QuizQuestion[];
  passingScore: number;
  onComplete: (result: QuizResult) => void;
  onRetry?: () => void;
}

export function QuizContainer({ 
  questions, 
  passingScore, 
  onComplete,
  onRetry 
}: QuizContainerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showResults, setShowResults] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleAnswer = (answerId: string) => {
    const question = questions[currentIndex];
    
    if (question.type === "multi-select") {
      const currentAnswers = (answers[question.id] as string[]) || [];
      const newAnswers = currentAnswers.includes(answerId)
        ? currentAnswers.filter(a => a !== answerId)
        : [...currentAnswers, answerId];
      setAnswers({ ...answers, [question.id]: newAnswers });
    } else {
      setAnswers({ ...answers, [question.id]: answerId });
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      calculateResults();
    }
  };

  const calculateResults = () => {
    let correctCount = 0;
    const wrongAnswers: QuizResult["wrongAnswers"] = [];

    questions.forEach(question => {
      const userAnswer = answers[question.id];
      const isCorrect = Array.isArray(userAnswer)
        ? userAnswer.sort().join(",") === question.correctAnswers.sort().join(",")
        : userAnswer === question.correctAnswers[0];

      if (isCorrect) {
        correctCount++;
      } else {
        wrongAnswers.push({
          questionId: question.id,
          question: question.question,
          userAnswer: userAnswer || "",
          correctAnswer: question.correctAnswers,
          explanation: question.explanation,
        });
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const quizResult: QuizResult = {
      passed: score >= passingScore,
      score,
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      wrongAnswers,
      xpEarned: score >= passingScore ? 50 : 10,
    };

    setResult(quizResult);
    setShowResults(true);
    onComplete(quizResult);
  };

  const handleRetry = () => {
    setCurrentIndex(0);
    setAnswers({});
    setShowResults(false);
    setResult(null);
    onRetry?.();
  };

  const isAnswered = () => {
    const answer = answers[currentQuestion.id];
    if (Array.isArray(answer)) return answer.length > 0;
    return !!answer;
  };

  if (showResults && result) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardContent className="py-8 text-center">
          <div className={`
            inline-flex items-center justify-center w-20 h-20 rounded-full mb-4
            ${result.passed 
              ? "bg-green-100 dark:bg-green-900/30" 
              : "bg-red-100 dark:bg-red-900/30"
            }
          `}>
            {result.passed ? (
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            ) : (
              <XCircle className="h-10 w-10 text-red-500" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {result.passed ? "Congratulations!" : "Keep Practicing!"}
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You scored {result.score}% ({result.correctAnswers}/{result.totalQuestions} correct)
          </p>

          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{result.score}%</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your Score</p>
            </div>
            <div className="h-12 w-px bg-gray-200 dark:bg-gray-700" />
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{passingScore}%</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Passing Score</p>
            </div>
          </div>

          {result.wrongAnswers.length > 0 && (
            <div className="text-left mb-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
                Review Incorrect Answers:
              </h3>
              <div className="space-y-3">
                {result.wrongAnswers.map((wrong, i) => (
                  <div key={i} className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="font-medium text-gray-900 dark:text-white mb-1">
                      {wrong.question}
                    </p>
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {wrong.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-3">
            {!result.passed && (
              <Button variant="outline" onClick={handleRetry} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Try Again
              </Button>
            )}
            <Button className="gap-2">
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {Math.round(progress)}%
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      
      <CardContent>
        <CardTitle className="text-xl text-gray-900 dark:text-white mb-6">
          {currentQuestion.question}
        </CardTitle>

        <div className="space-y-3 mb-6">
          {currentQuestion.options.map((option) => {
            const isSelected = currentQuestion.type === "multi-select"
              ? (answers[currentQuestion.id] as string[] || []).includes(option.id)
              : answers[currentQuestion.id] === option.id;

            return (
              <button
                key={option.id}
                onClick={() => handleAnswer(option.id)}
                className={`
                  w-full p-4 text-left rounded-lg border-2 transition-all
                  ${isSelected
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center
                    ${isSelected
                      ? "border-blue-500 bg-blue-500"
                      : "border-gray-300 dark:border-gray-600"
                    }
                  `}>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <span className="text-gray-900 dark:text-white">{option.text}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleNext} 
            disabled={!isAnswered()}
            className="gap-2"
          >
            {currentIndex < questions.length - 1 ? "Next" : "Submit"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
