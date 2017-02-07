#!/bin/bash

fileName=""

if [ "build" != "$1" ]; then
  fileName=$1
fi

if [ "" != "$2" ]; then
  fileName=$2
fi

if [ ! -d "compile" ]; then
  echo "------------------------------------------------------------------------------------------------"
  echo "- Creation of 'compile' directory to avoid conflicts with binary files generated by Eclipse... -"
  echo "------------------------------------------------------------------------------------------------"
  mkdir ./resources/compile
fi

if [ "build" == "$1" ]; then
  echo "------------------------------------------------------------------------------------------------"
  echo "--------------------------------- Compiling scala code... --------------------------------------"
  echo "------------------------------------------------------------------------------------------------"
  scalac -d compile -cp lib/json-simple-1.1.1.jar -sourcepath ../src ../src/*.scala
fi

echo "------------------------------------------------------------------------------------------------"
echo "----------------------------------- Start executing code... ------------------------------------"
echo "------------------------------------------------------------------------------------------------"
scala -cp compile:lib/json-simple-1.1.1.jar Main "$fileName"

if [ "" != "$fileName" ]; then
  echo "------------------------------------------------------------------------------------------------"
  echo "--------------------------------- Album pages building...---------------------------------------"
  echo "------------------------------------------------------------------------------------------------"
  python buildAlbum.py ../resources/solutions/"$fileName album-2per3"
fi
echo "------------------------------------------------------------------------------------------------"
echo "------------------------------------- Work is done :) ------------------------------------------"
echo "------------------------------------------------------------------------------------------------"
