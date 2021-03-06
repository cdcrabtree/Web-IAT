<?php
/*!
 * WebIAT
 * This project was originally developed for Margaret Shih and Geoff Ho at the UCLA Anderson School of Management by Stephen Searles.
 * This code is licensed under the Eclipse Public License (EPL) version 1.0, which is available here: http://www.eclipse.org/legal/epl-v10.html.
 * 
 * Author: Stephen Searles
 * Date: May 10, 2011
 */
require_once 'GlobalKLogger.php';
abstract class GreenwaldIATProcessor {
  function standard_deviation($array) {
    $mean = GreenwaldIATProcessor::mean($array);
    foreach ($array as $value) {
      $variance += pow($value - $mean, 2);
    }
    return sqrt($variance / (count($array) - 1));
  }

  function mean($array) {
    $sum = array_sum($array);
    $num = count($array);
    return $sum / $num;
  }

  function reconcileStage($correctArray, $incorrectArray) {
    $combinedArray = $correctArray;
    if ($incorrectArray != null && count($incorrectArray) > 0) {
      $addAmount = GreenwaldIATProcessor::standard_deviation($correctArray) * 2; //can also be simply 600
      $passArray = array(
          "array" => &$combinedArray,
          "add" => $addAmount
      );
      array_walk($incorrectArray, reconcileThroughArrayWalk, $passArray);
    }
    return $combinedArray;
  }

  function reconcileThroughArrayWalk($value, $index, $passArray) {
    $passArray['array'][] = $value + $passArray['add'];
  }

  function handleRowWithMatchingSubject($theRow, $s3, $s3in, $s6, $s6in, $s4, $s4in, $s7, $s7in) {
    global $subject;
    global $log;
    if (intval($theRow['response_time'], 10) > 10000) {
      $responseId = $theRow['response_id'];
      eLogInfo("Ignoring response ID $responseId on subject $subject. Response time is greater than 10,000 msec.",$log);
      return;
    }
    switch ($theRow['stage']) {
      case 3: {
          if (GreenwaldIATProcessor::checkResponse($theRow['response'], $theRow['correct_response'])) {
            $s3[] = intval($theRow['response_time'], 10);
          } else {
            $s3in[] = intval($theRow['response_time'], 10);
          }
          break;
        }
      case 4: {
          if (GreenwaldIATProcessor::checkResponse($theRow['response'], $theRow['correct_response'])) {
            $s4[] = intval($theRow['response_time'], 10);
          } else {
            $s4in[] = intval($theRow['response_time'], 10);
          }
          break;
        }
      case 6: {
          if (GreenwaldIATProcessor::checkResponse($theRow['response'], $theRow['correct_response'])) {
            $s6[] = intval($theRow['response_time'], 10);
          } else {
            $s6in[] = intval($theRow['response_time'], 10);
          }
          break;
        }
      case 7: {
          if (GreenwaldIATProcessor::checkResponse($theRow['response'], $theRow['correct_response'])) {
            $s7[] = intval($theRow['response_time'], 10);
          } else {
            $s7in[] = intval($theRow['response_time'], 10);
          }
          break;
        }
      default: {

        }
    }
  }

  function checkResponse($response, $correct_response) {
    switch ($correct_response) {
      case 0: {
          if ($response == "right") {
            return false;
          } else {
            return true;
          }
          break;
        }
      case 1: {
          if ($response == "right") {
            return true;
          } else {
            return false;
          }
          break;
        }
      default: {
          return false;
        }
    }
  }

  function handleSubjectAndReturnScore($stage3correctArray, $stage3incorrectArray, $stage6correctArray, $stage6incorrectArray, $stage4correctArray, $stage4incorrectArray, $stage7correctArray, $stage7incorrectArray) {
    global $subject;
    global $log;
    //check amount of correct answers
    if (count($stage3correctArray) < 1) {
      eLogInfo("Dropping subject $subject. Stage 3 has zero correct answers.",$log);
      return null;
    }
    if (count($stage4correctArray) < 1) {
      eLogInfo("Dropping subject $subject. Stage 4 has zero correct answers.",$log);
      return null;
    }
    if (count($stage6correctArray) < 1) {
      eLogInfo("Dropping subject $subject. Stage 6 has zero correct answers.",$log);
      return null;
    }
    if (count($stage7correctArray) < 1) {
      eLogInfo("Dropping subject $subject. Stage 7 has zero correct answers.",$log);
      return null;
    }
    if (count($stage3correctArray) < count($stage3incorrectArray)) {
      eLogWarn("Subject $subject has more incorrect answers than correct answers in stage 3.",$log);
    }
    if (count($stage4correctArray) < count($stage4incorrectArray)) {
      eLogWarn("Subject $subject has more incorrect answers than correct answers in stage 4.",$log);
    }
    if (count($stage6correctArray) < count($stage6incorrectArray)) {
      eLogWarn("Subject $subject has more incorrect answers than correct answers in stage 6.",$log);
    }
    if (count($stage7correctArray) < count($stage7incorrectArray)) {
      eLogWarn("Subject $subject has more incorrect answers than correct answers in stage 7.",$log);
    }
    
    //reconcile incorrect arrays
    if (!($stage3array = GreenwaldIATProcessor::reconcileStage($stage3correctArray, $stage3incorrectArray))) {
      eLogInfo("Dropping subject $subject. Stage 3 is empty; bailing out.",$log);
      return null;
    }
    if (!($stage4array = GreenwaldIATProcessor::reconcileStage($stage4correctArray, $stage4incorrectArray))) {
      eLogInfo("Dropping subject $subject. Stage 4 is empty; bailing out.",$log);
      return null;
    }
    if (!($stage6array = GreenwaldIATProcessor::reconcileStage($stage6correctArray, $stage6incorrectArray))) {
      eLogInfo("Dropping subject $subject. Stage 6 is empty; bailing out.",$log);
      return null;
    }
    if (!($stage7array = GreenwaldIATProcessor::reconcileStage($stage7correctArray, $stage7incorrectArray))) {
      eLogInfo("Dropping subject $subject. Stage 7 is empty; bailing out.",$log);
      return null;
    }
    //"inclusive" standard deviations
    $stage3_6sd = GreenwaldIATProcessor::standard_deviation(array_merge($stage3array, $stage6array));
    $stage4_7sd = GreenwaldIATProcessor::standard_deviation(array_merge($stage4array, $stage7array));
    //take means of the stages
    $stage3mean = GreenwaldIATProcessor::mean($stage3array);
    $stage6mean = GreenwaldIATProcessor::mean($stage6array);
    $stage4mean = GreenwaldIATProcessor::mean($stage4array);
    $stage7mean = GreenwaldIATProcessor::mean($stage7array);
    //calculate subject score
    return mean(array(
        ($stage6mean - $stage3mean) / $stage3_6sd,
        ($stage7mean - $stage4mean) / $stage4_7sd
    ));
  }
  function verifyResponseTimes($result) {
    mysql_data_seek($result, 0);
    while ($row = mysql_fetch_assoc($result)) {
      if ($row['response_time'] < 300) {
        $lowTimes += 1;
      }
      $num += 1;
    }
    mysql_data_seek($result, 0);
    if ($lowTimes/$num > 0.1) {
      return false;
    } else {
      return true;
    }
  }
  function calculateAndSetScore($subj,$logFile) {
    global $subject;
    $subject = $subj;
    global $log;
    $log = KLogger::instance($logFile, KLogger::INFO);
    include 'connect.php';
    $query = "SELECT responses.response,responses.response_id,responses.response_time,stimuli.correct_response,stimuli.stimulusCategory,stimuliGroups.stage FROM responses JOIN (stimuli,stimuliGroups) ON (responses.stimulus=stimuli.stimulus_id AND stimuli.group=stimuliGroups.id) WHERE (responses.subj=$subj) ORDER BY responses.response_id";
    eLogDebug("Calculating score with query:$query",$log);
    $result = mysql_query($query);
    if (mysql_num_rows($result) < 1) {
      eLogInfo("Dropping subject $subject. Missing subject or responses.",$log);
      return null;
    }
    $verify = GreenwaldIATProcessor::verifyResponseTimes($result);
    if ($verify) {
      while ($row = mysql_fetch_assoc($result)) {
        GreenwaldIATProcessor::handleRowWithMatchingSubject($row, &$stage3correctArray, &$stage3incorrectArray, &$stage6correctArray, &$stage6incorrectArray, &$stage4correctArray, &$stage4incorrectArray, &$stage7correctArray, &$stage7incorrectArray);
      }
      $score = GreenwaldIATProcessor::handleSubjectAndReturnScore(&$stage3correctArray, &$stage3incorrectArray, &$stage6correctArray, &$stage6incorrectArray, &$stage4correctArray, &$stage4incorrectArray, &$stage7correctArray, &$stage7incorrectArray);
      $query = "UPDATE subjects SET `score`=$score WHERE `id`=$subj";
      mysql_query($query);
      mysql_close();
      eLogDebug("Successful calculation. Subject $subject's score is $score.",$log);
      return $score;
    } else {
      eLogInfo("Dropping subject $subject. Greater than 10% of response times are less than 300 msec.",$log);
    }
  }
}
?>
