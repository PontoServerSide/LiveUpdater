LiveUpdater
===========
1.	Monitor에게 보내져야할 정보

		HAProxy
			Cluster Count
			Connection Count
			CPU Useage (%)
			Available Memory (MB)
			Traffic
				Total
				Sent
				Received

			Cluster Info
				Cluster IP or Index
				CPU Useage
				Available Memroy (MB)
				Trafic
					Total
					Sent
					Received

2.	Data Example
	$HAProxy_ClusterCount,ConnectionCount,CPU Useage,Available Memory,Trafic Total,Trafic Sent,Trafic Received,Cluster1 IP or Index,CPU Useage,Available Memory,Trafic Total,Trafic Sent,Trafic Received,Cluster2 IP or Index,CPU Useage,Available Memory,Trafic Total,Trafic Sent,Trafic Received,..........................................\n

	Serialize 해서 Monitor로 Socket 전송