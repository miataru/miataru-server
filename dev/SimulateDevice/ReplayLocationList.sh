IFS1=$'\n' longitudes=($(cat ./longitude.txt))
IFS2=$'\n' latitudes=($(cat ./latitude.txt))

while true
do
for i in `seq 1 559`;
        do
                ./SimulateDevice.sh "${longitudes[$i]}" "${latitudes[$i]}"
		sleep 5	
        done
done
