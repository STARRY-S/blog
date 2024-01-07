#!/bin/bash
#

for filename in *.jpg
do
	echo "{}" >> $filename.meta
done
