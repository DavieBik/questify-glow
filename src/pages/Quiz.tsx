import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle, XCircle, Award } from 'lucide-react';
import { toast } from 'sonner';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  explanation: string;
  points: number;
  order_index: number;
  quiz_answer_options: {
    id: string;
    option_text: string;
    is_correct: boolean;
    order_index: number;
  }[];
}

interface Answer {
  question_id: string;
  selected_option_id: string;
}

const Quiz = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (moduleId) {
      fetchQuizQuestions();
    }
  }, [moduleId]);

  // Load answer for current question when index changes
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      const currentAnswer = answers.find(a => a.question_id === questions[currentQuestionIndex].id);
      setSelectedOption(currentAnswer?.selected_option_id || '');
    }
  }, [currentQuestionIndex, questions]);

  // Timer effect
  useEffect(() => {
    if (timeRemaining !== null && timeRemaining > 0 && !isComplete) {
      const timer = setTimeout(() => {
        setTimeRemaining(timeRemaining - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeRemaining === 0) {
      handleSubmitQuiz();
    }
  }, [timeRemaining, isComplete]);

  const fetchQuizQuestions = async () => {
    try {
      // First get module info for time limit
      const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select('time_limit_minutes')
        .eq('id', moduleId)
        .single();

      if (moduleError) throw moduleError;

      // Set timer if there's a time limit
      if (moduleData.time_limit_minutes) {
        setTimeRemaining(moduleData.time_limit_minutes * 60);
      }

      // Fetch quiz questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select(`
          *,
          quiz_answer_options (
            id,
            option_text,
            is_correct,
            order_index
          )
        `)
        .eq('module_id', moduleId)
        .order('order_index');

      if (questionsError) throw questionsError;

      // Sort answer options by order_index
      const sortedQuestions = questionsData.map(q => ({
        ...q,
        quiz_answer_options: q.quiz_answer_options.sort((a, b) => a.order_index - b.order_index)
      }));

      setQuestions(sortedQuestions);
    } catch (error) {
      console.error('Error fetching quiz questions:', error);
      toast.error('Failed to load quiz questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (optionId: string) => {
    setSelectedOption(optionId);
  };

  const handleNextQuestion = () => {
    if (!selectedOption) {
      toast.error('Please select an answer before continuing');
      return;
    }

    // Save the answer
    const newAnswer: Answer = {
      question_id: questions[currentQuestionIndex].id,
      selected_option_id: selectedOption,
    };

    const updatedAnswers = [...answers];
    const existingIndex = updatedAnswers.findIndex(a => a.question_id === newAnswer.question_id);
    
    if (existingIndex >= 0) {
      updatedAnswers[existingIndex] = newAnswer;
    } else {
      updatedAnswers.push(newAnswer);
    }
    
    setAnswers(updatedAnswers);
    setSelectedOption('');

    // Move to next question or submit if last question
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmitQuiz(updatedAnswers);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      // Load previous answer if exists
      const previousAnswer = answers.find(a => a.question_id === questions[currentQuestionIndex - 1].id);
      setSelectedOption(previousAnswer?.selected_option_id || '');
    }
  };

  const handleSubmitQuiz = async (finalAnswers = answers) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Calculate score
      let correctAnswers = 0;
      const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
      let earnedPoints = 0;

      questions.forEach(question => {
        const userAnswer = finalAnswers.find(a => a.question_id === question.id);
        if (userAnswer) {
          const selectedOption = question.quiz_answer_options.find(opt => opt.id === userAnswer.selected_option_id);
          if (selectedOption?.is_correct) {
            correctAnswers++;
            earnedPoints += question.points;
          }
        }
      });

      const scorePercentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
      const timeSpentMinutes = Math.round((Date.now() - startTime) / 1000 / 60);

      // Get module info for pass threshold
      const { data: moduleData } = await supabase
        .from('modules')
        .select('pass_threshold_percentage')
        .eq('id', moduleId)
        .single();

      const isPassed = scorePercentage >= (moduleData?.pass_threshold_percentage || 80);

      // Update completion record
      const { error: updateError } = await supabase
        .from('completions')
        .update({
          status: isPassed ? 'completed' : 'failed',
          score_percentage: scorePercentage,
          points_earned: earnedPoints,
          points_possible: totalPoints,
          time_spent_minutes: timeSpentMinutes,
          completed_at: new Date().toISOString(),
        })
        .eq('user_id', user?.id)
        .eq('module_id', moduleId)
        .eq('status', 'in_progress');

      if (updateError) throw updateError;

      setScore(scorePercentage);
      setIsComplete(true);
      
      toast.success(isPassed ? 'Quiz completed successfully!' : 'Quiz completed. You can retake it to improve your score.');
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast.error('Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-2">No Quiz Available</h2>
        <p className="text-muted-foreground mb-4">This module doesn't have a quiz yet.</p>
        <Button onClick={() => navigate(`/modules/${moduleId}`)}>
          Back to Module
        </Button>
      </div>
    );
  }

  if (isComplete) {
    const isPassed = score! >= 80; // You might want to get this from module data
    
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              {isPassed ? (
                <CheckCircle className="h-16 w-16 text-green-600" />
              ) : (
                <XCircle className="h-16 w-16 text-red-600" />
              )}
            </div>
            <CardTitle className="text-2xl">
              {isPassed ? 'Congratulations!' : 'Quiz Complete'}
            </CardTitle>
            <CardDescription>
              {isPassed 
                ? 'You have successfully passed the quiz!' 
                : 'You can retake the quiz to improve your score.'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{score}%</div>
              <p className="text-muted-foreground">Your Score</p>
            </div>
            
            <div className="space-y-4">
              <Button 
                onClick={() => navigate(`/modules/${moduleId}`)}
                className="w-full"
              >
                Back to Module
              </Button>
              
              {isPassed && (
                <Button 
                  variant="outline"
                  onClick={() => navigate('/certificates')}
                  className="w-full"
                >
                  <Award className="h-4 w-4 mr-2" />
                  View Certificates
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quiz</h1>
          <p className="text-muted-foreground">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
        </div>
        {timeRemaining !== null && (
          <div className="flex items-center gap-2 text-lg font-medium">
            <Clock className="h-5 w-5" />
            <span className={timeRemaining < 300 ? 'text-red-600' : ''}>
              {formatTime(timeRemaining)}
            </span>
          </div>
        )}
      </div>

      {/* Progress */}
      <Progress value={progress} className="w-full" />

      {/* Question */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {currentQuestion.question_text}
          </CardTitle>
          <CardDescription>
            Points: {currentQuestion.points}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={selectedOption} onValueChange={handleAnswerSelect}>
            {currentQuestion.quiz_answer_options.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <RadioGroupItem value={option.id} id={option.id} />
                <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                  {option.option_text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>
        
        <Button
          onClick={handleNextQuestion}
          disabled={!selectedOption || isSubmitting}
        >
          {currentQuestionIndex === questions.length - 1 ? 'Submit Quiz' : 'Next Question'}
        </Button>
      </div>
    </div>
  );
};

export default Quiz;