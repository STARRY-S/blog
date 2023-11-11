#!/usr/bin/env python3

import os, time, subprocess

original_dir = "original"

def main():
    directory = os.fsencode(original_dir)
    for file in os.listdir(directory):
        name = os.fsdecode(file)
        if not name.endswith(".jpg") and not name.endswith(".jpeg"):
            continue

        input_file = os.path.join(original_dir, name)
        ct = time.strptime(time.ctime(os.path.getmtime(input_file)))
        output_file = time.strftime("%Y%m%d-%H%M%S.jpg", ct)
        if os.path.exists(output_file):
            continue

        print(input_file, "=>", output_file)
        subprocess.run([
            "ffmpeg", "-loglevel", "16", "-y",
            "-i", input_file, "-vf",
            "scale='min(if(gt(a,1/1),3840,-1),iw)':'min(if(gt(a,1/1),-1,3840),ih)'",
            output_file
        ])
        subprocess.run([
            "exiftool", "-tagsfromfile",
            input_file,
            "-exif",
            "-overwrite_original",
            output_file
        ])

if __name__ == "__main__":
    main()